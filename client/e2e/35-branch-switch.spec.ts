import { expect, test } from './fixtures';
import { api, purgeProductsBySkuPrefix } from './helpers/api';

/**
 * BUG fix: cambiar de sucursal en el selector del nav debe actualizar la data en
 * pantalla. Repro: un producto que solo existe en la sucursal HOME (Principal)
 * debe DESAPARECER al cambiar a otra sucursal, y reaparecer al volver.
 *
 * Requiere ≥2 sucursales activas (el seed/dev tiene Principal + Sucursal 2) y un
 * admin con branches.switch.
 */

const SKU_PREFIX = 'E2E-NAVSW-';
const PRODUCT_NAME = 'E2E NavSwitch Producto';
const OTHER_BRANCH = 'Sucursal 2';

test.describe.serial('Cambio de sucursal en el nav', () => {
  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    // Sin header X-Branch-Id → el producto se crea en la sucursal HOME del admin.
    await api('/products', {
      method: 'POST',
      body: JSON.stringify({ name: PRODUCT_NAME, sku: `${SKU_PREFIX}P1`, salePrice: '10.00' }),
    });
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('cambiar de sucursal actualiza la lista de productos', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    const row = page.getByRole('link', { name: PRODUCT_NAME });
    const switcher = page.getByRole('combobox', { name: 'Sucursal activa' });

    // En la sucursal HOME el producto se ve.
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(switcher).toBeVisible();

    // Cambiar a otra sucursal → el producto (que no existe allí) desaparece.
    await switcher.selectOption({ label: OTHER_BRANCH });
    await expect(row).toBeHidden({ timeout: 10_000 });

    // Volver a la sucursal HOME → reaparece (refetch determinista, no caché vieja).
    await switcher.selectOption({ label: 'Principal' });
    await expect(row).toBeVisible({ timeout: 10_000 });
  });
});
