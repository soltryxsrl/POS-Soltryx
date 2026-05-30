import { expect, test } from './fixtures';

test('dashboard carga autenticado (no redirige a login)', async ({ page }) => {
  await page.goto('/');
  // Esperamos que el bootstrap-auth complete (call a /auth/refresh).
  await page.waitForLoadState('networkidle');
  // El sidebar tiene "Productos", "Inventario", etc. — específicos del dashboard,
  // no del login.
  await expect(page.getByRole('link', { name: /productos/i }).first()).toBeVisible();
  // Y no estamos en /login
  expect(page.url()).not.toContain('/login');
});
