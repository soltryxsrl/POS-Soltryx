import { expect, test } from './fixtures';
import {
  api,
  ensureCashSessionOpen,
  purgeProductsBySkuPrefix,
} from './helpers/api';

const SKU_PREFIX = 'E2E-REFUND-ARQUEO-';

/**
 * Shape parcial del reporte de arqueo (GET /cash-sessions/:id/report).
 * Solo declaramos lo que el test consume. Ver
 * server/.../get-session-report.use-case.ts (SessionReport).
 *
 * IMPORTANTE sobre los totales del arqueo (cash-payment-totals.adapter):
 *   - `paidOuts`     = SUMA de TODOS los cash_movements PAID_OUT de la sesión.
 *   - `cashRefunds`  = pagos CASH de ventas CANCELADAS (NO devoluciones).
 *   - Una devolución mantiene la venta COMPLETED e inserta un PAID_OUT, por lo
 *     que afecta `paidOuts`/`expectedAmount` pero NO `cashRefunds`.
 *
 * La sesión de caja la comparte toda la suite (ensureCashSessionOpen reutiliza
 * la sesión abierta), así que estos totales NO son absolutos: medimos DELTAS
 * respecto a un snapshot tomado antes de la devolución.
 */
interface SessionReport {
  paidOuts: string;
  cashRefunds: string;
  expectedAmount: string;
  movements: Array<{
    type: 'PAID_IN' | 'PAID_OUT';
    amount: string;
    reason: string;
  }>;
}

interface SaleReturn {
  id: string;
  returnNumber: string;
  refundMethod: string;
  subtotal: string;
  taxTotal: string;
  total: string;
}

function toCents(v: string): number {
  return Math.round(parseFloat(v) * 100);
}

test.describe.serial('Devolución en efectivo y arqueo de caja', () => {
  let productId = '';
  let saleId = '';
  let cashSessionId = '';
  // Datos capturados durante el test de devolución, reusados en el de listado.
  let createdReturnNumber = '';

  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);

    // Abrir (o reutilizar) sesión de caja
    cashSessionId = await ensureCashSessionOpen();

    // Crear producto de prueba
    const product = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Refund Test Producto',
        sku: `${SKU_PREFIX}P1`,
        salePrice: '100.00',
        taxRate: '18.00',
        initialStock: '10',
      }),
    });
    productId = product.id;

    // Crear venta con pago en CASH via API. 2 × 100 + 18% = 236.00
    const sale = await api<{ id: string; saleNumber: string }>('/sales', {
      method: 'POST',
      body: JSON.stringify({
        cashSessionId,
        items: [{ productId, quantity: '2' }],
        payments: [{ method: 'CASH', amount: '236.00' }],
      }),
    });
    saleId = sale.id;
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('registrar devolución en efectivo y verificar PAID_OUT en arqueo', async ({
    page,
  }) => {
    // === SNAPSHOT PREVIO DEL ARQUEO ===
    // La sesión es compartida por la suite; medimos deltas, no absolutos.
    const before = await api<SessionReport>(
      `/cash-sessions/${cashSessionId}/report`,
    );

    // Precondición: la venta tiene exactamente 1 línea devolvible (el producto
    // de prueba). Confirma que el detalle/diálogo mostrará un solo ítem.
    const returnable = await api<Array<{ saleItemId: string; remaining: string }>>(
      `/sales/${saleId}/returnable-items`,
    );
    expect(returnable.length).toBe(1);
    expect(parseFloat(returnable[0].remaining)).toBe(2);

    // Navegar al detalle de la venta
    await page.goto(`/sales/${saleId}`);
    await page.waitForLoadState('networkidle');

    // Verificar que la página cargó (el detalle usa <h1>Venta {saleNumber}</h1>)
    await expect(
      page.getByRole('heading', { name: /^Venta /i }),
    ).toBeVisible({ timeout: 15_000 });

    // Abrir el diálogo de devolución (botón con icono Undo2 + texto "Devolución")
    await page.getByRole('button', { name: /^Devolución$/i }).click();

    // MaintenanceShell renderiza role="dialog" con aria-label = título, y un
    // <h2> con el mismo texto. Localizamos por el aria-label (más estable).
    const dialog = page.getByRole('dialog', { name: /^Devolución sobre /i });
    await expect(dialog).toBeVisible({ timeout: 8_000 });

    // Rellenar cantidad a devolver del primer (único) ítem. El input es un
    // <input type="number"> dentro de la tabla de devoluciones.
    const qtyInput = dialog.locator('input[type="number"]').first();
    await expect(qtyInput).toBeVisible();
    await qtyInput.fill('1'); // Devolver 1 de 2 unidades

    // El total a reembolsar se calcula en vivo: 1 × 100 + 18% = 118.00
    // (RD$118.00 — el substring 118.00 basta para confirmar el cálculo).
    await expect(dialog.getByText(/118[.,]00/)).toBeVisible();

    // Seleccionar método de reembolso CASH. Los métodos son <button type=button>
    // con el texto "Efectivo" (REFUND_LABELS.CASH). CASH viene seleccionado por
    // defecto, pero hacemos click explícito para no depender del default.
    const cashButton = dialog.getByRole('button', { name: /^Efectivo$/ });
    await expect(cashButton).toBeVisible();
    await cashButton.click();

    // Mensaje contextual del método CASH
    await expect(
      dialog.getByText(/Sale del efectivo de la caja activa/i),
    ).toBeVisible();

    // Motivo (opcional) — el Input tiene placeholder que empieza por "Ej:"
    await dialog.locator('input[placeholder^="Ej:"]').first().fill('Producto defectuoso');

    // Confirmar devolución (botón submit con texto "Confirmar devolución")
    await dialog.getByRole('button', { name: /^Confirmar devolución$/i }).click();

    // El diálogo se cierra al completar la mutación
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    // La página revalida y muestra la sección "Devoluciones de esta venta".
    await expect(
      page.getByRole('heading', { name: /^Devoluciones de esta venta$/i }),
    ).toBeVisible({ timeout: 10_000 });

    // === VERIFICACIÓN VIA API ===
    // 1. La devolución creada (scoped a esta venta → determinista).
    const returns = await api<SaleReturn[]>(`/sales/${saleId}/returns`);
    expect(returns.length).toBe(1);
    const createdReturn = returns[0];
    createdReturnNumber = createdReturn.returnNumber;
    expect(createdReturn.returnNumber).toMatch(/^RT-\d{6}$/);
    expect(createdReturn.refundMethod).toBe('CASH');
    expect(createdReturn.subtotal).toBe('100.00');
    expect(createdReturn.taxTotal).toBe('18.00');
    // 1 unidad × 100 + (100 × 18%) = 118.00 (reembolso con ITBIS incluido).
    expect(createdReturn.total).toBe('118.00');

    // 2. Reporte de sesión DESPUÉS de la devolución.
    const after = await api<SessionReport>(
      `/cash-sessions/${cashSessionId}/report`,
    );

    // La devolución en CASH añade EXACTAMENTE un PAID_OUT de 118.00 al arqueo.
    // Medimos el delta porque la sesión es compartida por la suite.
    const paidOutsDelta = toCents(after.paidOuts) - toCents(before.paidOuts);
    expect(paidOutsDelta).toBe(11800);

    // 3. El movimiento PAID_OUT de ESTA devolución (reason incluye su RT-NNNNNN,
    //    que es único) está registrado con el monto correcto.
    const refundMovement = after.movements.find(
      (m) =>
        m.type === 'PAID_OUT' && m.reason.includes(createdReturn.returnNumber),
    );
    expect(refundMovement).toBeDefined();
    expect(refundMovement!.amount).toBe('118.00');

    // 4. El efectivo esperado del cajón baja EXACTAMENTE 118.00 (el PAID_OUT).
    //    expectedAmount = opening + cashSales − cashRefunds + paidIns − paidOuts.
    const expectedDelta = toCents(after.expectedAmount) - toCents(before.expectedAmount);
    expect(expectedDelta).toBe(-11800);

    // 5. cashRefunds NO debe moverse: una devolución NO cancela la venta, sólo
    //    registra un PAID_OUT (cashRefunds sólo cuenta CASH de ventas CANCELLED).
    expect(toCents(after.cashRefunds)).toBe(toCents(before.cashRefunds));
  });

  test('navegar a /returns y verificar devolución en listado', async ({ page }) => {
    // Sanity: el test previo debe haber registrado el número de devolución.
    expect(createdReturnNumber).toMatch(/^RT-\d{6}$/);

    await page.goto('/returns');
    await page.waitForLoadState('networkidle');

    // La página de devoluciones cargó (SectionHeader → <h1>Devoluciones</h1>).
    await expect(
      page.getByRole('heading', { name: /^Devoluciones$/i }),
    ).toBeVisible({ timeout: 15_000 });

    // La tabla está ordenada por fecha DESC, así que nuestra devolución recién
    // creada aparece arriba. La localizamos por su número (único) en una fila.
    const row = page.getByRole('row').filter({ hasText: createdReturnNumber });
    await expect(row).toBeVisible({ timeout: 10_000 });

    // En esa fila: badge de reembolso "Efectivo" (REFUND_LABEL.CASH) y el total.
    await expect(row.getByText(/^Efectivo$/)).toBeVisible();
    await expect(row.getByText(/118[.,]00/)).toBeVisible();
  });
});
