import { expect, test } from './fixtures';
import { api, rdToday } from './helpers/api';

/**
 * Fiscal 608 — Anular documento standalone y verificar en informe.
 *
 * Flujo:
 *   1. Emitir documento standalone (E41 compra informal) vía API.
 *   2. Navegar a /impuestos/facturas, encontrar el documento (columna NCF).
 *   3. Verificar que el estado es "Emitido" (ISSUED) en la fila.
 *   4. Abrir modal "Anular comprobante", elegir tipo anulación (05), confirmar
 *      → POST /fiscal/documents/{id}/void.
 *   5. Verificar que aparece en /api/fiscal/reports/608 (JSON + TXT).
 *   6. Verificar la UI de /impuestos/informe-608 (título, fechas, descarga,
 *      tabla con el documento anulado, toggle "Todas las sucursales").
 *
 * Notas sobre el DOM real (de los componentes, no del render visual):
 *   - La tabla de comprobantes es el DataTable compartido: <tr> con celdas
 *     <td>. El NCF es un <span>, el estado un badge <span> con texto
 *     "Emitido"/"Anulado" (STATUS_LABEL). Anclamos por fila vía getByRole('row').
 *   - El modal de anulación (VoidButton) NO es un <dialog> ARIA: es un <div>
 *     con un <h3>Anular comprobante</h3>, un <Select> nativo y dos botones
 *     ("Cancelar" / "Anular"). Lo localizamos por su heading y scopeamos dentro.
 *   - El control Select envuelve un <select> nativo → selectOption funciona.
 *   - En /informe-608 el toggle "Todas las sucursales" es un Switch =
 *     <button role="switch">, NO un <input type="checkbox">. Sólo aparece con
 *     permiso branches.switch, así que el assert es condicional.
 *   - Los <th> usan clase CSS uppercase pero el texto del DOM conserva el JSX
 *     ("NCF", "Tipo", "Fecha anulación", "Tipo de anulación", "Contraparte").
 */

const API_BASE = 'http://localhost:3001/api';
const COUNTERPARTY = 'E2E Proveedor Test 608';

test.describe.serial('Fiscal 608 — Anular documento standalone', () => {
  let docId = '';
  let docNcf = '';
  const today = rdToday();
  const voidTypeCode = '05'; // Corrección de información
  const voidTypeLabel = '05 Corrección de información';

  test.beforeAll(async () => {
    // Emitir documento standalone E41 (compra informal) vía API.
    const result = await api<{
      id: string;
      ncf: string;
      docType: string;
      saleId: string | null;
      status: string;
    }>('/fiscal/documents/standalone', {
      method: 'POST',
      body: JSON.stringify({
        docTypeCode: 'E41',
        counterpartyName: COUNTERPARTY,
        counterpartyRnc: '00112345678',
        subtotal: '150.00',
        taxTotal: '0.00',
        total: '150.00',
      }),
    });

    expect(result.docType).toBe('E41');
    expect(result.ncf).toMatch(/^E41\d{10}$/);
    expect(result.saleId).toBeNull();
    expect(result.status).toBe('ISSUED');

    docId = result.id;
    docNcf = result.ncf;
  });

  test('navegar a /impuestos/facturas y encontrar documento emitido', async ({ page }) => {
    await page.goto('http://localhost:3000/impuestos/facturas');
    await page.waitForLoadState('networkidle');

    // La fila del documento, anclada por el NCF dentro de la tabla.
    const row = page.getByRole('row').filter({ hasText: docNcf });
    await expect(row).toBeVisible({ timeout: 10_000 });
  });

  test('estado del documento es ISSUED antes de anular', async ({ page }) => {
    await page.goto('http://localhost:3000/impuestos/facturas');
    await page.waitForLoadState('networkidle');

    const row = page.getByRole('row').filter({ hasText: docNcf });
    await expect(row).toBeVisible({ timeout: 10_000 });

    // El badge de estado para ISSUED renderiza el texto "Emitido"
    // (STATUS_LABEL.ISSUED). Texto exacto para no chocar con la opción
    // "Emitido" del <select> de filtros del toolbar.
    await expect(row.getByText('Emitido', { exact: true })).toBeVisible();
  });

  test('abrir modal "Anular comprobante" y seleccionar tipo anulación', async ({ page }) => {
    await page.goto('http://localhost:3000/impuestos/facturas');
    await page.waitForLoadState('networkidle');

    const row = page.getByRole('row').filter({ hasText: docNcf });
    await expect(row).toBeVisible({ timeout: 10_000 });

    // Botón "Anular" en la fila (el VoidButton variant=ghost).
    await row.getByRole('button', { name: 'Anular' }).click();

    // El modal abre: lo identificamos por su heading <h3>Anular comprobante</h3>.
    const heading = page.getByRole('heading', { name: 'Anular comprobante' });
    await expect(heading).toBeVisible({ timeout: 5_000 });

    // Scopeamos al contenedor del modal (el panel que contiene el heading).
    const modal = page
      .locator('div')
      .filter({ has: heading })
      .filter({ has: page.getByRole('button', { name: 'Cancelar' }) })
      .last();

    // El modal muestra el NCF del documento.
    await expect(modal.getByText(docNcf)).toBeVisible();

    // Seleccionar tipo de anulación "05 Corrección de información" en el
    // <select> nativo del modal (el control Select).
    await modal.locator('select').selectOption(voidTypeCode);

    // Confirmar: el botón destructive "Anular" del modal.
    await modal.getByRole('button', { name: 'Anular' }).click();

    // El modal cierra cuando la anulación termina.
    await expect(heading).toBeHidden({ timeout: 10_000 });

    // Confirmación determinista: anular NO cambia `status` (sigue ISSUED), solo
    // setea voided_at — por eso la tabla NO muestra "Anulado". Verificamos el
    // efecto real: el NCF ya aparece en el informe 608 (proyección de anulados).
    await expect
      .poll(
        async () => {
          const r = await api<{ rows: Array<{ ncf: string }> }>(
            `/fiscal/reports/608?from=${today}&to=${today}`,
          );
          return r.rows.some((x) => x.ncf === docNcf) ? 1 : 0;
        },
        { timeout: 10_000, message: 'el NCF anulado debe aparecer en el 608' },
      )
      .toBe(1);
  });

  test('verificar que el documento aparece en informe 608 (JSON)', async () => {
    // La proyección al 608 puede ser fire-and-forget; reintentamos.
    await expect
      .poll(
        async () => {
          const report = await api<{
            rows: Array<{
              ncf: string;
              docType: string;
              tipoAnulacion: string;
              fechaAnulacion: string;
              buyerName: string | null;
            }>;
            summary: { totalRows: number };
          }>(`/fiscal/reports/608?from=${today}&to=${today}`);
          return report.rows.some((r) => r.ncf === docNcf);
        },
        { timeout: 10_000, message: 'el NCF anulado no apareció en el 608' },
      )
      .toBe(true);

    const report = await api<{
      rows: Array<{
        ncf: string;
        docType: string;
        tipoAnulacion: string;
        fechaAnulacion: string;
        buyerName: string | null;
      }>;
      summary: { totalRows: number };
    }>(`/fiscal/reports/608?from=${today}&to=${today}`);

    const voidedRow = report.rows.find((r) => r.ncf === docNcf);
    expect(voidedRow).toBeDefined();
    expect(voidedRow!.docType).toBe('E41');
    expect(voidedRow!.tipoAnulacion).toBe(voidTypeCode);
    expect(voidedRow!.fechaAnulacion).toMatch(/^\d{8}$/); // YYYYMMDD
    expect(voidedRow!.buyerName).toBe(COUNTERPARTY);
    expect(report.summary.totalRows).toBeGreaterThanOrEqual(1);
  });

  test('descargar TXT 608 y verificar contenido', async () => {
    const token = (await api<{ accessToken?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        emailOrUsername: 'admin@t1et.local',
        password: 'Admin123!',
      }),
    })) as { accessToken: string };

    const res = await fetch(
      `${API_BASE}/fiscal/reports/608?from=${today}&to=${today}&format=txt`,
      {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      },
    );

    expect(res.ok).toBe(true);
    const txt = await res.text();
    expect(txt.length).toBeGreaterThan(0);

    // El TXT contiene el NCF anulado.
    expect(txt).toContain(docNcf);

    // Cada línea es pipe-delimited. Formato 608 (server toTxt):
    //   NCF | FechaAnulacion (YYYYMMDD) | TipoAnulacion (01..09)
    const lines = txt.split('\n').filter((l) => l.trim().length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(1);
    for (const line of lines) {
      const parts = line.split('|');
      expect(parts.length).toBe(3);
    }

    // La línea de nuestro NCF tiene fecha YYYYMMDD y el tipo de anulación 05.
    const ourLine = lines.find((l) => l.startsWith(docNcf));
    expect(ourLine).toBeDefined();
    const [, fecha, tipo] = ourLine!.split('|');
    expect(fecha).toMatch(/^\d{8}$/);
    expect(tipo).toBe(voidTypeCode);
  });

  test('navegación a /impuestos/informe-608 y verificar UI', async ({ page }) => {
    await page.goto('http://localhost:3000/impuestos/informe-608');
    await page.waitForLoadState('networkidle');

    // Título (SectionHeader h1). Usamos role=heading para no chocar con el
    // breadcrumb (un <span> con el mismo texto → locator ambiguo).
    await expect(
      page.getByRole('heading', { name: 'Informe 608 — Comprobantes Anulados' }),
    ).toBeVisible();
    await expect(
      page.getByText('NCF anulados (quemados sin transacción) en el rango', {
        exact: false,
      }),
    ).toBeVisible();

    // Inputs de rango de fechas (label "Desde" / "Hasta" + Input type=date).
    const inputFrom = page
      .locator('div')
      .filter({ has: page.getByText('Desde', { exact: true }) })
      .locator('input[type="date"]')
      .first();
    const inputTo = page
      .locator('div')
      .filter({ has: page.getByText('Hasta', { exact: true }) })
      .locator('input[type="date"]')
      .first();
    await expect(inputFrom).toBeVisible();
    await expect(inputTo).toBeVisible();

    // Botón de descarga (texto "Descargar 608_YYYYMMDD_YYYYMMDD.txt").
    await expect(
      page.getByRole('button', { name: /Descargar/ }),
    ).toBeVisible();
  });

  test('tabla en informe 608 muestra el documento anulado', async ({ page }) => {
    await page.goto('http://localhost:3000/impuestos/informe-608');
    await page.waitForLoadState('networkidle');

    // La sección "Vista previa" siempre está presente.
    await expect(page.getByText('Vista previa')).toBeVisible();

    // La tabla sólo se renderiza si hay filas; el NCF aparece en una celda.
    await expect(page.getByText(docNcf)).toBeVisible({ timeout: 10_000 });

    // Cabeceras de la tabla (texto del DOM, no el render uppercase por CSS).
    const headerTexts = await page.locator('thead th').allTextContents();
    expect(headerTexts).toContain('NCF');
    expect(headerTexts).toContain('Tipo');
    expect(headerTexts).toContain('Fecha anulación');
    expect(headerTexts).toContain('Tipo de anulación');
    expect(headerTexts).toContain('Contraparte');

    // La fila del documento anulado muestra E41, el tipo de anulación y la
    // contraparte.
    const row = page.getByRole('row').filter({ hasText: docNcf });
    await expect(row).toBeVisible();
    // exact: el NCF "E41000..." también contiene "E41"; queremos la celda docType.
    await expect(row.getByText('E41', { exact: true })).toBeVisible();
    await expect(row.getByText(voidTypeLabel)).toBeVisible();
    await expect(row.getByText(COUNTERPARTY)).toBeVisible();
  });

  test('botón de descarga del TXT 608 funciona', async ({ page }) => {
    await page.goto('http://localhost:3000/impuestos/informe-608');
    await page.waitForLoadState('networkidle');

    // Esperar a que la tabla cargue (hay al menos nuestro NCF).
    await expect(page.getByText(docNcf)).toBeVisible({ timeout: 10_000 });

    // El botón debe estar habilitado (hasRows === true).
    const downloadButton = page.getByRole('button', { name: /Descargar/ });
    await expect(downloadButton).toBeEnabled();

    // Escuchar la descarga disparada por el <a download> programático.
    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    const download = await downloadPromise;

    // Nombre esperado: 608_YYYYMMDD_YYYYMMDD.txt
    expect(download.suggestedFilename()).toMatch(/^608_\d{8}_\d{8}\.txt$/);
  });

  test('toggle "Todas las sucursales" está disponible si tiene permiso', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000/impuestos/informe-608');
    await page.waitForLoadState('networkidle');

    // El toggle (Switch) sólo se renderiza con permiso branches.switch. Si no
    // existe, el test pasa (es opcional). El control es un <label> con el texto
    // "Todas las sucursales" que envuelve un <button role="switch"> (sin
    // accessible name propio porque el botón no tiene id ni aria-labelledby),
    // por eso lo anclamos por la etiqueta y bajamos al role=switch.
    const toggleWrapper = page
      .locator('label')
      .filter({ hasText: 'Todas las sucursales' });
    const count = await toggleWrapper.count();

    if (count > 0) {
      await expect(toggleWrapper.first()).toBeVisible();
      const toggle = toggleWrapper.first().getByRole('switch');
      await expect(toggle).toBeVisible();
      // Por defecto está apagado (allBranches = false → aria-checked="false").
      await expect(toggle).toHaveAttribute('aria-checked', 'false');
    }
  });

  test.afterAll(async () => {
    // El documento anulado queda en el 608 para auditoría; no se borra.
    // (docId queda disponible por si en el futuro hace falta limpieza.)
    void docId;
  });
});
