import { test, expect } from '@playwright/test';
import { api, purgeProductsBySkuPrefix, rdToday } from './helpers/api';

/**
 * #1 Historial de cambios de precio (manual + masivo) y
 * #2 Reporte de stock bajo usando el punto de reorden (no solo el mínimo).
 */

const SKU_PREFIX = 'E2E-PH-';

interface PriceEntry {
  productId: string;
  field: string;
  oldValue: string;
  newValue: string;
  source: string;
}

interface LowStockRow {
  id: string;
  stock: string;
  minStock: string;
  reorderPoint: string;
  threshold: string;
}

test.beforeEach(async () => {
  await purgeProductsBySkuPrefix(SKU_PREFIX);
});
test.afterAll(async () => {
  await purgeProductsBySkuPrefix(SKU_PREFIX);
});

test('historial registra cambio manual y cambio masivo de precio', async () => {
  const p = await api<{ id: string }>('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'E2E Historial precio',
      sku: `${SKU_PREFIX}A`,
      salePrice: '100.00',
      costPrice: '60.00',
    }),
  });

  // Cambio MANUAL: 100 → 120
  await api(`/products/${p.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ salePrice: '120.00' }),
  });

  // Cambio MASIVO: +10% sobre 120 → 132
  await api('/products/bulk/prices', {
    method: 'POST',
    body: JSON.stringify({
      scope: 'ids',
      productIds: [p.id],
      field: 'salePrice',
      mode: 'increasePct',
      value: '10',
    }),
  });

  const today = rdToday();
  const rep = await api<{ items: PriceEntry[]; total: number }>(
    `/reports/price-history?from=${today}&to=${today}&productId=${p.id}`,
  );
  const mine = rep.items.filter((e) => e.productId === p.id && e.field === 'sale_price');
  expect(mine.length).toBe(2);

  const manual = mine.find((e) => e.source === 'manual');
  const bulk = mine.find((e) => e.source === 'bulk');
  expect(manual, 'cambio manual').toBeTruthy();
  expect(Number(manual!.oldValue)).toBeCloseTo(100, 2);
  expect(Number(manual!.newValue)).toBeCloseTo(120, 2);

  expect(bulk, 'cambio masivo').toBeTruthy();
  expect(Number(bulk!.oldValue)).toBeCloseTo(120, 2);
  expect(Number(bulk!.newValue)).toBeCloseTo(132, 2);
});

test('un cambio que no mueve el precio no genera historial', async () => {
  const p = await api<{ id: string }>('/products', {
    method: 'POST',
    body: JSON.stringify({ name: 'E2E sin cambio', sku: `${SKU_PREFIX}B`, salePrice: '50.00' }),
  });
  // PATCH con el MISMO precio (y otro campo) → no debe registrar historial.
  await api(`/products/${p.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ salePrice: '50.00', name: 'E2E sin cambio (editado)' }),
  });
  const today = rdToday();
  const rep = await api<{ items: PriceEntry[] }>(
    `/reports/price-history?from=${today}&to=${today}&productId=${p.id}`,
  );
  expect(rep.items.filter((e) => e.productId === p.id).length).toBe(0);
});

test('stock bajo usa el punto de reorden cuando está definido', async () => {
  // stock 5, mínimo 0, reorden 10 → con la lógica vieja (solo mínimo) NO alertaba
  // (min=0); con reorden alerta (5 <= 10).
  const p = await api<{ id: string }>('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'E2E reorden',
      sku: `${SKU_PREFIX}C`,
      salePrice: '10.00',
      initialStock: '5',
      minStock: '0',
      reorderPoint: '10',
    }),
  });

  // El reporte ahora es paginado: { items, total, limit, offset }. Pedimos un
  // límite alto para asegurar que el producto de prueba caiga en la primera página.
  const rep = await api<{ items: LowStockRow[] }>(
    '/reports/products/low-stock?limit=100',
  );
  const mine = rep.items.find((r) => r.id === p.id);
  expect(mine, 'producto bajo el punto de reorden debe aparecer').toBeTruthy();
  expect(Number(mine!.threshold)).toBeCloseTo(10, 3);
  expect(Number(mine!.reorderPoint)).toBeCloseTo(10, 3);
});
