import { test, expect } from '@playwright/test';
import { api } from './helpers/api';

/**
 * Plan/licencia: GET /plan devuelve topes (null = ilimitado) + uso actual.
 * El tope lo fija Soltryx (super-admin) por SQL/endpoint; aquí solo verificamos
 * la forma y que el uso refleje datos reales. El enforcement (bloqueo al tope)
 * se cubre en el unit test del server (plan-limits.service.spec).
 */
test('GET /plan devuelve límites + uso', async () => {
  const plan = await api<{
    maxUsers: number | null;
    maxBranches: number | null;
    usedUsers: number;
    usedBranches: number;
  }>('/plan');

  // Topes: número o null (ilimitado).
  expect(plan.maxUsers === null || typeof plan.maxUsers === 'number').toBe(true);
  expect(plan.maxBranches === null || typeof plan.maxBranches === 'number').toBe(true);
  // Uso: enteros >= 1 (hay al menos el admin y la sucursal Principal).
  expect(Number.isInteger(plan.usedUsers)).toBe(true);
  expect(Number.isInteger(plan.usedBranches)).toBe(true);
  expect(plan.usedUsers).toBeGreaterThanOrEqual(1);
  expect(plan.usedBranches).toBeGreaterThanOrEqual(1);
});

test('PATCH /plan sin secreto super-admin es rechazado (403)', async () => {
  // El admin del cliente NO puede cambiar su propio plan: sin el secreto
  // super-admin el endpoint responde 403 (deshabilitado o clave inválida).
  await expect(
    api('/plan', { method: 'PATCH', body: JSON.stringify({ maxBranches: 99 }) }),
  ).rejects.toThrow(/403/);
});
