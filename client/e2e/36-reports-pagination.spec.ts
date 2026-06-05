import { test, expect } from '@playwright/test';
import { api, rdToday } from './helpers/api';

/**
 * Paginación de los reportes de lista: top productos, márgenes, lento movimiento
 * y stock bajo ahora devuelven { items, total, limit, offset }. Verifica la
 * forma paginada y que limit/offset se respeten (independiente de los datos).
 */

interface Paged {
  items: unknown[];
  total: number;
  limit: number;
  offset: number;
}

function assertPaged(r: Paged, limit: number, offset: number) {
  expect(Array.isArray(r.items)).toBe(true);
  expect(typeof r.total).toBe('number');
  expect(r.total).toBeGreaterThanOrEqual(0);
  expect(r.limit).toBe(limit);
  expect(r.offset).toBe(offset);
  // La página nunca trae más ítems que el límite.
  expect(r.items.length).toBeLessThanOrEqual(limit);
}

test('los reportes de lista devuelven forma paginada y respetan limit/offset', async () => {
  const today = rdToday();

  const low = await api<Paged>('/reports/products/low-stock?limit=5&offset=0');
  assertPaged(low, 5, 0);

  const top = await api<Paged>(`/reports/products/top?from=${today}&to=${today}&limit=5&offset=0`);
  assertPaged(top, 5, 0);

  const margins = await api<Paged>(
    `/reports/products/margins?from=${today}&to=${today}&limit=5&offset=0`,
  );
  assertPaged(margins, 5, 0);

  const slow = await api<Paged>('/reports/products/slow-movers?days=30&limit=5&offset=0');
  assertPaged(slow, 5, 0);

  // offset distinto se refleja en la respuesta.
  const lowPage2 = await api<Paged>('/reports/products/low-stock?limit=5&offset=5');
  assertPaged(lowPage2, 5, 5);
});
