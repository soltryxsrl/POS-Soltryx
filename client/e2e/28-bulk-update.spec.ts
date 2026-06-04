import { test, expect } from '@playwright/test';
import { api, purgeProductsBySkuPrefix } from './helpers/api';

/**
 * Lote 1 — niveles de stock (máx/reorden) + actualización masiva de precios y
 * niveles. Verifica el round-trip de los campos nuevos al crear/editar y los
 * endpoints `POST /products/bulk/prices` y `/products/bulk/stock-levels`.
 *
 * Es un spec API-first (no navega UI): el feature es de backend y el catálogo
 * se acota a la sucursal activa, igual que en la app.
 */

const SKU_PREFIX = 'E2E-BULK-';

interface ProductDto {
  id: string;
  sku: string;
  salePrice: string;
  costPrice: string;
  minStock: string;
  maxStock: string;
  reorderPoint: string;
}

async function createProduct(
  suffix: string,
  overrides: Partial<{
    salePrice: string;
    costPrice: string;
    categoryId: string;
  }> = {},
): Promise<ProductDto> {
  return api<ProductDto>('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: `Bulk ${suffix}`,
      sku: `${SKU_PREFIX}${suffix}`,
      salePrice: overrides.salePrice ?? '100.00',
      costPrice: overrides.costPrice ?? '60.00',
      ...(overrides.categoryId && { categoryId: overrides.categoryId }),
    }),
  });
}

async function getProduct(id: string): Promise<ProductDto> {
  return api<ProductDto>(`/products/${id}`);
}

test.beforeEach(async () => {
  await purgeProductsBySkuPrefix(SKU_PREFIX);
});

test.afterAll(async () => {
  await purgeProductsBySkuPrefix(SKU_PREFIX);
});

test('crea y edita producto con máximo y punto de reorden', async () => {
  const created = await api<ProductDto>('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Bulk niveles',
      sku: `${SKU_PREFIX}NIV`,
      salePrice: '50.00',
      minStock: '5',
      maxStock: '40',
      reorderPoint: '10',
    }),
  });
  expect(created.minStock).toBe('5.000');
  expect(created.maxStock).toBe('40.000');
  expect(created.reorderPoint).toBe('10.000');

  await api(`/products/${created.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ maxStock: '99', reorderPoint: '20' }),
  });
  // Releemos del servidor (normaliza a 3 decimales) para verificar lo persistido.
  const updated = await getProduct(created.id);
  expect(updated.maxStock).toBe('99.000');
  expect(updated.reorderPoint).toBe('20.000');
});

test('bulk: aumenta precio de venta 10% por lista de ids', async () => {
  const a = await createProduct('A', { salePrice: '100.00' });
  const b = await createProduct('B', { salePrice: '250.50' });

  const res = await api<{ updated: number }>('/products/bulk/prices', {
    method: 'POST',
    body: JSON.stringify({
      scope: 'ids',
      productIds: [a.id, b.id],
      field: 'salePrice',
      mode: 'increasePct',
      value: '10',
    }),
  });
  expect(res.updated).toBe(2);

  expect((await getProduct(a.id)).salePrice).toBe('110.00');
  // 250.50 * 1.10 = 275.55
  expect((await getProduct(b.id)).salePrice).toBe('275.55');
});

test('bulk: reduce precio por monto y nunca baja de 0', async () => {
  const a = await createProduct('C', { salePrice: '30.00' });

  await api('/products/bulk/prices', {
    method: 'POST',
    body: JSON.stringify({
      scope: 'ids',
      productIds: [a.id],
      field: 'salePrice',
      mode: 'decreaseAmount',
      value: '100', // mayor que el precio → debe quedar en 0, no negativo
    }),
  });
  expect((await getProduct(a.id)).salePrice).toBe('0.00');
});

test('bulk: fija el precio de costo de una categoría completa', async () => {
  const cat = await api<{ id: string }>('/categories', {
    method: 'POST',
    body: JSON.stringify({ name: `${SKU_PREFIX}cat` }),
  });
  const a = await createProduct('D', { costPrice: '10.00', categoryId: cat.id });
  const b = await createProduct('E', { costPrice: '99.99', categoryId: cat.id });
  // Uno FUERA de la categoría no debe tocarse.
  const outsider = await createProduct('F', { costPrice: '5.00' });

  const res = await api<{ updated: number }>('/products/bulk/prices', {
    method: 'POST',
    body: JSON.stringify({
      scope: 'category',
      categoryId: cat.id,
      field: 'costPrice',
      mode: 'set',
      value: '42.50',
    }),
  });
  expect(res.updated).toBe(2);
  expect((await getProduct(a.id)).costPrice).toBe('42.50');
  expect((await getProduct(b.id)).costPrice).toBe('42.50');
  expect((await getProduct(outsider.id)).costPrice).toBe('5.00');

  // Limpieza de la categoría de prueba.
  await api(`/categories/${cat.id}`, { method: 'DELETE' }).catch(() => undefined);
});

test('bulk: fija niveles de stock (mín/máx/reorden) por lista de ids', async () => {
  const a = await createProduct('G');
  const b = await createProduct('H');

  const res = await api<{ updated: number }>('/products/bulk/stock-levels', {
    method: 'POST',
    body: JSON.stringify({
      scope: 'ids',
      productIds: [a.id, b.id],
      minStock: '3',
      maxStock: '50',
      reorderPoint: '8',
    }),
  });
  expect(res.updated).toBe(2);

  for (const id of [a.id, b.id]) {
    const p = await getProduct(id);
    expect(p.minStock).toBe('3.000');
    expect(p.maxStock).toBe('50.000');
    expect(p.reorderPoint).toBe('8.000');
  }
});

test('bulk stock-levels: solo escribe los campos provistos', async () => {
  const a = await createProduct('I');
  // set inicial
  await api('/products/bulk/stock-levels', {
    method: 'POST',
    body: JSON.stringify({
      scope: 'ids',
      productIds: [a.id],
      minStock: '5',
      maxStock: '20',
      reorderPoint: '7',
    }),
  });
  // ahora solo cambia el máximo
  await api('/products/bulk/stock-levels', {
    method: 'POST',
    body: JSON.stringify({ scope: 'ids', productIds: [a.id], maxStock: '99' }),
  });
  const p = await getProduct(a.id);
  expect(p.maxStock).toBe('99.000');
  expect(p.minStock).toBe('5.000'); // intacto
  expect(p.reorderPoint).toBe('7.000'); // intacto
});
