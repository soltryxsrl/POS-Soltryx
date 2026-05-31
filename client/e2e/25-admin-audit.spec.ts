import { expect, test } from './fixtures';
import {
  api,
  ensureCashSessionOpen,
  purgeProductsBySkuPrefix,
} from './helpers/api';

const SKU_PREFIX = 'E2E-AUDIT-';

interface AuditEvent {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}
interface AuditList {
  items: AuditEvent[];
  total: number;
}

// Texto único por corrida para identificar NUESTRO evento entre el ruido de
// otros tests del describe.serial (el log es global y ordena por fecha desc).
const CANCEL_REASON = `Test auditoria ${Date.now()}`;

test.describe.serial('Admin — Bitácora de auditoría (sales.cancel)', () => {
  let saleId = '';
  let productId = '';
  let sessId = '';

  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    sessId = await ensureCashSessionOpen();

    // Crear producto
    const product = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Audit Producto',
        sku: `${SKU_PREFIX}P1`,
        salePrice: '100.00',
        taxRate: '0.00',
        initialStock: '10',
      }),
    });
    productId = product.id;

    // Crear venta para luego cancelar
    const sale = await api<{ id: string; saleNumber: string }>('/sales', {
      method: 'POST',
      body: JSON.stringify({
        cashSessionId: sessId,
        items: [{ productId, quantity: '1' }],
        payments: [{ method: 'CASH', amount: '100.00' }],
      }),
    });
    saleId = sale.id;
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('crear evento auditable (cancelar venta) y verificar en log de auditoría', async ({
    page,
  }) => {
    // 1) Navegar a la venta y cancelarla vía UI
    await page.goto(`/sales/${saleId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /^Venta /i })).toBeVisible();
    await page.getByRole('button', { name: /anular venta/i }).click();

    // El diálogo es un MaintenanceShell: role="dialog" con aria-label = título
    // ("Anular venta <num>") y un <h2> con ese mismo texto.
    const dlg = page.getByRole('dialog');
    await expect(
      dlg.getByRole('heading', { name: /anular venta/i }),
    ).toBeVisible();

    // Único <input> del diálogo: el campo "Motivo".
    await dlg.locator('input').first().fill(CANCEL_REASON);

    // El botón "Confirmar anulación" está deshabilitado hasta reason.length >= 3;
    // el click auto-espera a que esté habilitado.
    await dlg
      .getByRole('button', { name: /confirmar anulación/i })
      .click();

    // El diálogo se cierra y el botón "Anular venta" desaparece (status != COMPLETED).
    await expect(dlg).toBeHidden({ timeout: 10_000 });
    await expect(
      page.getByRole('button', { name: /anular venta/i }),
    ).toBeHidden({ timeout: 10_000 });

    // 2) La auditoría es fire-and-forget (void this.audit.record(...)): el evento
    //    'sales.cancel' puede persistirse con retraso tras responder la cancelación.
    //    Confirmamos de forma DETERMINISTA contra la API, filtrando por el entityId
    //    EXACTO de nuestra venta (el controller valida entityId como UUID y el
    //    evento guarda entityId = sale.id). expect.poll reintenta hasta verlo.
    await expect
      .poll(
        async () => {
          const res = await api<AuditList>(
            `/audit-events?action=sales.cancel&entityId=${saleId}&limit=50`,
          );
          const ev = res.items.find(
            (e) =>
              e.entityId === saleId &&
              e.payload?.reason === CANCEL_REASON,
          );
          return ev ? 1 : 0;
        },
        {
          message: 'el evento sales.cancel de la venta debe persistirse',
          timeout: 20_000,
          intervals: [500, 1_000, 1_000, 2_000],
        },
      )
      .toBe(1);

    // 3) Verificar en la UI del log de auditoría
    await page.goto('/admin/audit');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /Bitácora de auditoría/ }),
    ).toBeVisible();

    // Filtrar por "Ventas anuladas" (el <select> usa value="sales.cancel").
    // OJO: el primer <select> de la página es el "Sucursal activa" del header;
    // identificamos el de auditoría por la opción que SOLO él tiene.
    const filterSelect = page
      .locator('select')
      .filter({ has: page.locator('option[value="sales.cancel"]') });
    await filterSelect.selectOption('sales.cancel');
    await page.waitForLoadState('networkidle');

    // Tras el filtro debe aparecer al menos una fila "Venta anulada"
    // (ACTION_LABEL['sales.cancel']). Auto-waiting de Playwright.
    const rows = page.getByRole('button').filter({ hasText: 'Venta anulada' });
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    // 4) Nuestro evento es el sales.cancel más reciente → primera fila. Lo
    //    expandimos para ver el payload, que incluye la razón de cancelación.
    await rows.first().click();

    // El detalle (pre con JSON.stringify(payload)) debe contener nuestra razón
    // única. Usamos el texto exacto para no confundirnos con otros eventos.
    await expect(page.getByText(CANCEL_REASON)).toBeVisible({
      timeout: 10_000,
    });
  });
});
