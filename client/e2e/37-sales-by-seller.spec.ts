import { test, expect } from '@playwright/test';
import {
  api,
  ensureCashSessionOpen,
  purgeProductsBySkuPrefix,
  rdToday,
} from './helpers/api';

/**
 * Reporte "Ventas por vendedor": agrupa las ventas COMPLETED por el usuario que
 * las registró (el vendedor) con total y ticket promedio. Base para comisiones.
 */

const SKU_PREFIX = 'E2E-SELLER-';

interface SellerRow {
  userId: string;
  username: string;
  fullName: string;
  salesCount: number;
  total: string;
  avgTicket: string;
}

test.describe.serial('Ventas por vendedor', () => {
  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    const cashSessionId = await ensureCashSessionOpen();
    const product = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Vendedor',
        sku: `${SKU_PREFIX}P1`,
        salePrice: '100.00',
        taxRate: '0.00',
        initialStock: '10',
      }),
    });
    await api('/sales', {
      method: 'POST',
      body: JSON.stringify({
        cashSessionId,
        items: [{ productId: product.id, quantity: '1' }],
        payments: [{ method: 'CASH', amount: '100.00' }],
      }),
    });
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('agrupa ventas por el vendedor (usuario) con total y ticket promedio', async () => {
    const me = await api<{ user: { id: string } }>('/auth/me');
    const today = rdToday();
    const rows = await api<SellerRow[]>(
      `/reports/sales/by-seller?from=${today}&to=${today}`,
    );

    const mine = rows.find((r) => r.userId === me.user.id);
    expect(mine, 'el vendedor (admin) debe aparecer con su venta de hoy').toBeTruthy();
    expect(mine!.salesCount).toBeGreaterThanOrEqual(1);
    expect(Number(mine!.total)).toBeGreaterThanOrEqual(100);
    // Ticket promedio: entre 0 y el total, y ≈ total/cantidad (sin exigir el redondeo exacto).
    const avg = Number(mine!.avgTicket);
    expect(avg).toBeGreaterThan(0);
    expect(avg).toBeLessThanOrEqual(Number(mine!.total));
    expect(avg).toBeCloseTo(Number(mine!.total) / mine!.salesCount, 0);
  });
});
