import { test, expect } from '@playwright/test';
import {
  api,
  ensureCashSessionOpen,
  purgeProductsBySkuPrefix,
  rdToday,
} from './helpers/api';

/**
 * Lote 3 — Detalle de ventas línea por línea. Verifica el endpoint
 * `GET /reports/sales/detail`: cada renglón trae costo y margen, y el `summary`
 * agrega el rango filtrado. Filtra por fecha LOCAL RD (ver rdToday).
 */

const SKU_PREFIX = 'E2E-SDET-';

interface DetailLine {
  saleId: string;
  saleNumber: string;
  productId: string | null;
  quantity: string;
  unitPrice: string;
  total: string;
  unitCost: string;
  margin: string;
}

interface DetailReport {
  items: DetailLine[];
  total: number;
  summary: { lines: number; units: string; revenue: string; cost: string; margin: string };
}

test.describe.serial('Detalle de ventas', () => {
  let productId = '';
  let saleNumber = '';

  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    const cashSessionId = await ensureCashSessionOpen();

    const product = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Detalle venta',
        sku: `${SKU_PREFIX}P1`,
        salePrice: '100.00',
        costPrice: '60.00',
        taxRate: '0.00',
        initialStock: '10',
      }),
    });
    productId = product.id;

    const sale = await api<{ id: string; saleNumber: string }>('/sales', {
      method: 'POST',
      body: JSON.stringify({
        cashSessionId,
        items: [{ productId, quantity: '3' }],
        payments: [{ method: 'CASH', amount: '300.00' }],
      }),
    });
    saleNumber = sale.saleNumber;
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('lista la línea con costo y margen, y agrega el summary', async () => {
    const today = rdToday();
    const rep = await api<DetailReport>(
      `/reports/sales/detail?from=${today}&to=${today}&productId=${productId}`,
    );

    const line = rep.items.find((i) => i.productId === productId);
    expect(line).toBeTruthy();
    expect(line!.saleNumber).toBe(saleNumber);
    expect(line!.quantity).toBe('3.000');
    expect(line!.unitPrice).toBe('100.00');
    expect(line!.total).toBe('300.00');
    expect(line!.unitCost).toBe('60.00');
    // margen = total − cantidad × costo = 300 − 3·60 = 120
    expect(line!.margin).toBe('120.00');

    // summary acotado al producto en el rango (solo esta venta de prueba).
    expect(Number(rep.summary.revenue)).toBeCloseTo(300, 2);
    expect(Number(rep.summary.cost)).toBeCloseTo(180, 2);
    expect(Number(rep.summary.margin)).toBeCloseTo(120, 2);
    expect(rep.summary.lines).toBeGreaterThanOrEqual(1);
  });
});
