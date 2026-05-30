import { expect, test } from './fixtures';
import {
  api,
  ensureCashSessionOpen,
  purgeMyParkedCarts,
  purgeProductsBySkuPrefix,
} from './helpers/api';

const SKU_PREFIX = 'E2E-PARK-';

test.describe.serial('Parked carts preservan variantId', () => {
  let parentId = '';
  let varLId = '';

  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    await ensureCashSessionOpen();
    await purgeMyParkedCarts();
    const parent = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Park Camisa',
        sku: `${SKU_PREFIX}CAMISA`,
        salePrice: '500.00',
        taxRate: '0.00',
      }),
    });
    parentId = parent.id;
    const varL = await api<{ id: string }>(`/products/${parentId}/variants`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Talla L',
        sku: `${SKU_PREFIX}CAMISA-L`,
        initialStock: '10',
      }),
    });
    varLId = varL.id;
  });

  test.afterAll(async () => {
    await purgeMyParkedCarts();
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('estacionar y retomar conserva la variante', async ({ page }) => {
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');

    const search = page.getByPlaceholder(/busca por nombre/i);
    await search.fill(`${SKU_PREFIX}CAMISA`);
    await page.getByRole('button', { name: /E2E Park Camisa/ }).first().click();

    // VariantPicker
    await page.getByRole('button', { name: /Talla L/ }).click();
    await expect(
      page.getByRole('heading', { name: /Variantes · E2E Park/ }),
    ).toBeHidden();

    // Estacionar
    await page.getByRole('button', { name: /guardar para después/i }).click();
    const parkDlg = page.getByRole('dialog');
    await expect(
      parkDlg.getByRole('heading', { name: /guardar carrito para después/i }),
    ).toBeVisible();
    await parkDlg.getByRole('button', { name: /guardar carrito/i }).click();
    await expect(parkDlg).toBeHidden();

    // El carrito quedó vacío
    await expect(page.getByText(/Agrega productos desde la izquierda/i)).toBeVisible();

    // Abrir el drawer "En espera" y retomar
    await page.getByRole('button', { name: /en espera/i }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByRole('heading', { name: /carritos en espera/i })).toBeVisible();
    await drawer.getByRole('button', { name: /retomar/i }).click();

    // Verificación visual: la línea muestra "Camisa · Talla L"
    await expect(page.getByText(/E2E Park Camisa.*Talla L/)).toBeVisible();

    // Verificación: el cart store guarda variantId. La preview de totales
    // debe usar el precio de la variante (500.00 hereda del padre).
    // El subtotal mostrado debe ser 500.00.
    // El padre tiene tax_rate=0.00 así que total = 500.00.
    await expect(page.locator('text=/RD\\$.*500.00/').first()).toBeVisible();
  });
});
