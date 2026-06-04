import { test, expect } from '@playwright/test';
import {
  api,
  ensureCashSessionOpen,
  purgeProductsBySkuPrefix,
} from './helpers/api';

/**
 * Lote — Saldo valorado por PROMEDIO MÓVIL en el kardex (server).
 *
 * Escenario clásico de promedio móvil:
 *   1. Stock inicial: 10 u a costo 10  → avg 10, saldo 100
 *   2. Compra recibida: +10 u a costo 20 → avg (10·10 + 10·20)/20 = 15, saldo 300
 *   3. Venta: -5 u (sale al promedio 15) → avg 15, saldo 15·15 = 225
 *
 * Verifica `avgCost` y `balanceValue` que ahora calcula el read model
 * (`GET /inventory/movements?productId=...`).
 */

const SKU_PREFIX = 'E2E-PM-';

interface Movement {
  id: string;
  type: string;
  newStock: string;
  unitCost: string | null;
  avgCost: string | null;
  balanceValue: string | null;
}

test.describe.serial('Kardex — promedio móvil', () => {
  let supplierId = '';
  let productId = '';

  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    const cashSessionId = await ensureCashSessionOpen();

    const supplier = await api<{ id: string }>('/suppliers', {
      method: 'POST',
      body: JSON.stringify({ tradeName: 'E2E PM Supplier', rnc: '131000001', isActive: true }),
    });
    supplierId = supplier.id;

    // 1) Producto con stock inicial 10 @ costo 10.
    const product = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Promedio Móvil',
        sku: `${SKU_PREFIX}P1`,
        salePrice: '100.00',
        costPrice: '10.00',
        taxRate: '0.00',
        initialStock: '10',
      }),
    });
    productId = product.id;

    // 2) Orden de compra: +10 @ costo 20, y recibirla (mezcla el costo a 15).
    const po = await api<{ id: string; items: Array<{ id: string }> }>('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        supplierId,
        items: [{ productId, orderedQuantity: '10', unitCost: '20.00' }],
      }),
    });
    await api(`/purchase-orders/${po.id}/receive`, {
      method: 'POST',
      body: JSON.stringify({ items: [{ itemId: po.items[0].id, quantity: '10' }] }),
    });

    // 3) Venta de 5 (sale al promedio vigente 15).
    await api('/sales', {
      method: 'POST',
      body: JSON.stringify({
        cashSessionId,
        items: [{ productId, quantity: '5' }],
        payments: [{ method: 'CASH', amount: '500.00' }],
      }),
    });
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    if (supplierId) {
      await api(`/suppliers/${supplierId}`, { method: 'DELETE' }).catch(() => undefined);
    }
  });

  test('avgCost y balanceValue siguen el promedio móvil', async () => {
    const { items } = await api<{ items: Movement[] }>(
      `/inventory/movements?productId=${productId}&limit=50`,
    );

    // Identificamos cada movimiento por su stock resultante (10, 20, 15).
    const inicial = items.find((m) => m.type === 'PURCHASE' && m.newStock === '10.000');
    const compra = items.find((m) => m.type === 'PURCHASE' && m.newStock === '20.000');
    const venta = items.find((m) => m.type === 'SALE' && m.newStock === '15.000');

    expect(inicial, 'movimiento de stock inicial').toBeTruthy();
    expect(compra, 'movimiento de recepción de compra').toBeTruthy();
    expect(venta, 'movimiento de venta').toBeTruthy();

    // 1) inicial: avg 10, saldo 100
    expect(Number(inicial!.avgCost)).toBeCloseTo(10, 4);
    expect(Number(inicial!.balanceValue)).toBeCloseTo(100, 2);

    // 2) compra: avg 15, saldo 300
    expect(Number(compra!.avgCost)).toBeCloseTo(15, 4);
    expect(Number(compra!.balanceValue)).toBeCloseTo(300, 2);

    // 3) venta: avg 15 (la salida no altera el promedio), saldo 225
    expect(Number(venta!.avgCost)).toBeCloseTo(15, 4);
    expect(Number(venta!.balanceValue)).toBeCloseTo(225, 2);
  });
});
