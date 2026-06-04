import { test, expect } from '@playwright/test';
import { api, purgeProductsBySkuPrefix } from './helpers/api';

/**
 * Existencia comparativa por sucursal (matriz SKU × sucursal).
 * GET /reports/inventory/by-branch — consolidado, requiere branches.switch.
 */

const SKU_PREFIX = 'E2E-SBB-';

interface Report {
  branches: Array<{ id: string; name: string }>;
  items: Array<{
    sku: string;
    name: string;
    perBranch: Record<string, string>;
    totalStock: string;
  }>;
  total: number;
}

test.beforeEach(async () => {
  await purgeProductsBySkuPrefix(SKU_PREFIX);
});
test.afterAll(async () => {
  await purgeProductsBySkuPrefix(SKU_PREFIX);
});

test('la matriz pivotea el stock por sucursal', async () => {
  const sku = `${SKU_PREFIX}A`;
  await api('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'E2E Existencia sucursal',
      sku,
      salePrice: '10.00',
      initialStock: '7',
    }),
  });

  const rep = await api<Report>(
    `/reports/inventory/by-branch?q=${encodeURIComponent(sku)}`,
  );

  // Hay al menos una sucursal activa (Principal).
  expect(rep.branches.length).toBeGreaterThanOrEqual(1);

  const row = rep.items.find((it) => it.sku === sku);
  expect(row, 'el producto debe aparecer en la matriz').toBeTruthy();
  expect(Number(row!.totalStock)).toBeCloseTo(7, 3);

  // El total = suma de las columnas por sucursal.
  const sumPerBranch = Object.values(row!.perBranch).reduce((a, v) => a + Number(v), 0);
  expect(sumPerBranch).toBeCloseTo(7, 3);

  // El stock está en la sucursal activa (su id es una columna de la matriz).
  const branchIds = new Set(rep.branches.map((b) => b.id));
  const stockedBranch = Object.keys(row!.perBranch).find((id) => Number(row!.perBranch[id]) > 0);
  expect(stockedBranch).toBeTruthy();
  expect(branchIds.has(stockedBranch!)).toBe(true);
});
