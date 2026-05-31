import { expect, test } from './fixtures';
import {
  api,
  ensureCashSessionOpen,
  purgeProductsBySkuPrefix,
} from './helpers/api';
import { field } from './helpers/selectors';

const SKU_PREFIX = 'E2E-PUR-';

/**
 * Notas sobre el DOM real (confirmadas leyendo los componentes):
 *  - El endpoint REST de compras es `/purchase-orders` (NO `/purchases`); la ruta
 *    `/purchases/:id` es solo la página de Next.
 *  - CreatePurchaseOrderForm usa <Select> nativos (selectOption funciona) y el
 *    helper field() (label → wrapper → primer control) por label.
 *  - El input de Cantidad de cada línea es <input type="number"> (NO tiene texto,
 *    por eso el filtro `hasText` original lo descartaba y daba timeout).
 *  - El Costo unitario y el % ITBIS de la línea son <input inputmode="decimal">.
 *  - La sección "Datos fiscales DGII (para 606)" renderiza los campos de retención
 *    (ITBIS/ISR/Tipo) SOLO cuando hay un Tipo comprobante seleccionado.
 *  - El ProductPicker es un div role="dialog" aria-modal con <h3>Buscar producto</h3>.
 *  - "Recibir orden" es el title del MaintenanceShell → expone role="dialog" con
 *    aria-label="Recibir orden PO-xxxxxx" (no un heading semántico aparte fiable).
 */
test.describe.serial('Compras — crear orden con forma de pago + retenciones + recibir', () => {
  let supplierId = '';
  let productId = '';
  let productName = '';

  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    await ensureCashSessionOpen();

    // Crear proveedor (con RNC: B01 exige RNC del proveedor en el server)
    const supplier = await api<{ id: string }>('/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        tradeName: 'E2E Supplier Test',
        rnc: '123456789',
        isActive: true,
      }),
    });
    supplierId = supplier.id;

    // Crear producto con costo inicial y stock (para el cálculo de promedio móvil)
    productName = 'E2E Producto para Compra';
    const product = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: productName,
        sku: `${SKU_PREFIX}P1`,
        salePrice: '100.00',
        costPrice: '50.00',
        taxRate: '18.00',
        initialStock: '10',
      }),
    });
    productId = product.id;
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    try {
      await api(`/suppliers/${supplierId}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
  });

  test('crear orden de compra con forma de pago Transferencia + retenciones ITBIS/ISR', async ({
    page,
  }) => {
    // 1) Navegar a /purchases/new
    await page.goto('/purchases/new');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /Nueva orden de compra/i }),
    ).toBeVisible();

    // 2) Seleccionar proveedor. Anclamos el label para no chocar con
    //    "NCF del proveedor" / "N° factura del proveedor".
    const supplierField = field(page, /^Proveedor\*?$/);
    // Las opciones cargan async (useSuppliers). Esperamos a que la opción del
    // proveedor recién creado EXISTA antes de seleccionarla (más determinista que
    // reintentar selectOption a ciegas).
    await expect(
      supplierField.locator(`option[value="${supplierId}"]`),
    ).toHaveCount(1, { timeout: 15_000 });
    await supplierField.selectOption(supplierId);
    await expect(supplierField).toHaveValue(supplierId);

    // 3) Abrir el ProductPicker (es un dialog aria-modal con <h3>Buscar producto</h3>)
    await page.getByRole('button', { name: /agregar producto/i }).click();
    const pickerDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: /buscar producto/i }),
    });
    await expect(pickerDialog).toBeVisible();

    // Buscar por SKU
    const searchInput = pickerDialog.locator('input[placeholder*="Nombre, SKU"]');
    await searchInput.fill(`${SKU_PREFIX}P1`);

    // Hacer clic en el producto encontrado (el resultado es un <button>)
    await pickerDialog
      .getByRole('button', { name: new RegExp(productName) })
      .click();
    await expect(pickerDialog).toBeHidden();

    // 4) La línea aparece en la tabla "Productos a pedir"
    const lineRow = page.locator('tr').filter({ hasText: productName });
    await expect(lineRow).toBeVisible();

    // Cantidad: el único <input type="number"> de la línea (no tiene texto, por eso
    // el filtro original con hasText fallaba y daba timeout).
    const quantityInput = lineRow.locator('input[type="number"]');
    await quantityInput.fill('5');
    await expect(quantityInput).toHaveValue('5');

    // Costo unitario: primer <input inputmode="decimal"> de la fila (el segundo es % ITBIS).
    const costInput = lineRow.locator('input[inputmode="decimal"]').first();
    await costInput.fill('60.00');
    await expect(costInput).toHaveValue('60.00');

    // 5) Sección de datos fiscales DGII (texto exacto del JSX)
    await page
      .getByText('Datos fiscales DGII (para 606)')
      .scrollIntoViewIfNeeded();

    // 6) Tipo de comprobante fiscal (B01). El select carga del endpoint /fiscal/doc-types,
    //    así que reintentamos hasta que la opción esté disponible.
    const docTypeField = field(page, /Tipo comprobante/);
    await expect(async () => {
      await docTypeField.selectOption('B01');
      await expect(docTypeField).toHaveValue('B01');
    }).toPass({ timeout: 10_000 });

    // 7) NCF del proveedor (requerido al haber tipo de comprobante)
    const ncfField = field(page, /NCF del proveedor/);
    await ncfField.fill('B0100000001');

    // 8) Fecha del comprobante
    const invoiceDateField = field(page, /Fecha comprobante/);
    await invoiceDateField.fill('2026-05-31');

    // 9) Forma de pago: Transferencia
    const paymentField = field(page, /^Forma de pago\*?$/);
    await paymentField.selectOption('TRANSFER');
    await expect(paymentField).toHaveValue('TRANSFER');

    // 10) Retenciones (visibles solo tras seleccionar tipo de comprobante)
    const itbisField = field(page, /^ITBIS retenido\*?$/);
    await expect(itbisField).toBeVisible();
    await itbisField.fill('10.80'); // 18% de 60

    const isrField = field(page, /^ISR retenido\*?$/);
    await isrField.fill('5.40');

    const isrTypeField = field(page, /Tipo retención ISR/);
    await isrTypeField.selectOption('02'); // 02 Honorarios por servicios

    // 11) Crear la orden
    await page.getByRole('button', { name: /^Crear orden$/ }).click();
    // Esperar la navegación al detalle por UUID — NO matchear "/purchases/new"
    // (que ya es la URL actual y resolvería waitForURL al instante con poId="new").
    await page.waitForURL(/\/purchases\/[0-9a-fA-F-]{36}$/, { timeout: 15_000 });

    const poId = page.url().split('/').pop()!;

    // 12) Verificar via API (endpoint REST = /purchase-orders) que se guardó todo.
    const po = await api<{
      id: string;
      status: string;
      paymentMethod: string | null;
      itbisRetenido: string;
      isrRetenido: string;
      isrRetentionType: string | null;
      items: Array<{ productId: string; orderedQuantity: string; unitCost: string }>;
    }>(`/purchase-orders/${poId}`);

    expect(po.paymentMethod).toBe('TRANSFER');
    expect(Number(po.itbisRetenido)).toBeCloseTo(10.8, 2);
    expect(Number(po.isrRetenido)).toBeCloseTo(5.4, 2);
    expect(po.isrRetentionType).toBe('02');
    expect(po.items).toHaveLength(1);
    expect(po.items[0].productId).toBe(productId);
    expect(Number(po.items[0].unitCost)).toBeCloseTo(60, 2);
    expect(Number(po.items[0].orderedQuantity)).toBeCloseTo(5, 3);
    expect(po.status).toBe('PENDING');

    // 13) En el detalle, estado "Pendiente"
    await expect(page.getByText(/Pendiente/i).first()).toBeVisible();

    // 14) Recibir la orden. El botón "Recibir" solo aparece con permiso
    //     purchases.receive (el admin del seed lo tiene).
    await page.getByRole('button', { name: /^Recibir$/ }).click();

    // El diálogo es un MaintenanceShell: role="dialog" aria-label="Recibir orden PO-xxxxxx".
    const receiveDialog = page.getByRole('dialog', { name: /Recibir orden/ });
    await expect(receiveDialog).toBeVisible();

    // 15) Recibir las 5 unidades (input type=number; viene pre-rellenado con el
    //     pendiente "5.000", lo reescribimos explícitamente).
    const receiveQtyInput = receiveDialog.locator('input[type="number"]').first();
    await receiveQtyInput.fill('5');

    // 16) "Actualizar el costo del producto" — checkbox real (marcado por defecto).
    await receiveDialog.locator('input[type="checkbox"]').check();

    // 17) Confirmar recepción
    await receiveDialog
      .getByRole('button', { name: /confirmar recepción/i })
      .click();
    await expect(receiveDialog).toBeHidden();

    // 18) El detalle se refresca (la mutación invalida la query) → estado "Recibida".
    await expect(page.getByText(/Recibida/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // 19) Costo promedio móvil del producto:
    //     (50.00 * 10 + 60.00 * 5) / 15 = 800 / 15 = 53.33
    await expect
      .poll(
        async () => {
          const p = await api<{ costPrice: string }>(`/products/${productId}`);
          return Number(p.costPrice);
        },
        { timeout: 15_000, message: 'el costo promedio móvil debe ser 53.33' },
      )
      .toBeCloseTo(53.33, 2);

    // 20) La orden quedó RECEIVED con la cantidad recibida completa.
    const updatedPo = await api<{
      status: string;
      items: Array<{ receivedQuantity: string }>;
    }>(`/purchase-orders/${poId}`);
    expect(updatedPo.status).toBe('RECEIVED');
    expect(Number(updatedPo.items[0].receivedQuantity)).toBeCloseTo(5, 3);
  });

  test('selector de forma de pago acepta todas las opciones (CASH, TRANSFER, CARD, CREDIT, OTHER)', async ({
    page,
  }) => {
    const paymentMethods = ['CASH', 'TRANSFER', 'CARD', 'CREDIT', 'OTHER'];

    await page.goto('/purchases/new');
    await page.waitForLoadState('networkidle');

    const paymentField = field(page, /^Forma de pago\*?$/);
    await expect(paymentField).toBeVisible();

    for (const value of paymentMethods) {
      await paymentField.selectOption(value);
      await expect(paymentField).toHaveValue(value);
    }
  });

  test('los campos de retención aparecen solo al seleccionar tipo de comprobante', async ({
    page,
  }) => {
    await page.goto('/purchases/new');
    await page.waitForLoadState('networkidle');

    await page
      .getByText('Datos fiscales DGII (para 606)')
      .scrollIntoViewIfNeeded();

    const itbisField = field(page, /^ITBIS retenido\*?$/);
    const isrField = field(page, /^ISR retenido\*?$/);
    const isrTypeField = field(page, /Tipo retención ISR/);

    // Sin tipo de comprobante seleccionado, la sección de retenciones no se renderiza.
    await expect(itbisField).toHaveCount(0);
    await expect(isrField).toHaveCount(0);
    await expect(isrTypeField).toHaveCount(0);

    // Seleccionar tipo de comprobante (B01) — las opciones cargan async.
    const docTypeField = field(page, /Tipo comprobante/);
    await expect(async () => {
      await docTypeField.selectOption('B01');
      await expect(docTypeField).toHaveValue('B01');
    }).toPass({ timeout: 10_000 });

    // Ahora los campos de retención están visibles.
    await expect(itbisField).toBeVisible();
    await expect(isrField).toBeVisible();
    await expect(isrTypeField).toBeVisible();

    // Volver a "— No fiscal —" (value vacío) → la sección desaparece.
    await docTypeField.selectOption('');
    await expect(itbisField).toHaveCount(0);
    await expect(isrField).toHaveCount(0);
    await expect(isrTypeField).toHaveCount(0);
  });
});