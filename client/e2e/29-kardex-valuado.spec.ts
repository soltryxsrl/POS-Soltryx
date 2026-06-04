import { test, expect } from '@playwright/test';
import { api, purgeProductsBySkuPrefix } from './helpers/api';

/**
 * Lote 2 — Kardex valorizado. Verifica que cada movimiento sella su costo
 * unitario (`unitCost`): por defecto la base de costo vigente del producto
 * (promedio móvil) y, en compras, el costo recibido. La UI deriva Importe
 * (|cant| × costo) y Saldo (valor) (stockDespués × costo) de este campo.
 */

const SKU_PREFIX = 'E2E-KDX-';

interface ProductDto {
  id: string;
  costPrice: string;
}

interface MovementDto {
  id: string;
  type: string;
  quantity: string;
  newStock: string;
  unitCost: string | null;
}

test.beforeEach(async () => {
  await purgeProductsBySkuPrefix(SKU_PREFIX);
});

test.afterAll(async () => {
  await purgeProductsBySkuPrefix(SKU_PREFIX);
});

test('el stock inicial y los ajustes sellan el costo unitario', async () => {
  const p = await api<ProductDto>('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Kardex valuado',
      sku: `${SKU_PREFIX}A`,
      salePrice: '100.00',
      costPrice: '60.00',
      initialStock: '10',
    }),
  });
  expect(p.costPrice).toBe('60.00');

  // Ajuste manual +5 (entra a la base de costo vigente).
  await api('/inventory/adjust', {
    method: 'POST',
    body: JSON.stringify({ productId: p.id, quantity: '5', reason: 'Conteo' }),
  });

  const { items } = await api<{ items: MovementDto[] }>(
    `/inventory/movements?productId=${p.id}&limit=50`,
  );
  // Esperamos 2 movimientos: PURCHASE (stock inicial) y ADJUSTMENT.
  expect(items.length).toBe(2);
  for (const m of items) {
    expect(m.unitCost).not.toBeNull();
    // numeric(14,4) → "60.0000"
    expect(Number(m.unitCost)).toBeCloseTo(60, 4);
  }

  const adj = items.find((m) => m.type === 'ADJUSTMENT');
  expect(adj).toBeTruthy();
  expect(adj!.newStock).toBe('15.000');
  // Saldo (valor) que mostraría la UI = newStock × unitCost.
  expect(Number(adj!.newStock) * Number(adj!.unitCost)).toBeCloseTo(900, 2);
});
