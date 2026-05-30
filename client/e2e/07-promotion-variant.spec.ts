import { expect, test } from './fixtures';
import {
  api,
  purgeProductsBySkuPrefix,
  purgePromotionsByNamePrefix,
} from './helpers/api';
import { field } from './helpers/selectors';

const SKU_PREFIX = 'E2E-PROMO-';
const PROMO_PREFIX = 'E2E PROMO ';

test.describe.serial('Promoción dirigida a una variante', () => {
  let parentId = '';
  let varLId = '';

  test.beforeAll(async () => {
    await purgePromotionsByNamePrefix(PROMO_PREFIX);
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    const parent = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Promo Camisa',
        sku: `${SKU_PREFIX}CAMISA`,
        salePrice: '500.00',
        taxRate: '18.00',
      }),
    });
    parentId = parent.id;
    await api(`/products/${parentId}/variants`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Talla M',
        sku: `${SKU_PREFIX}CAMISA-M`,
        initialStock: '10',
      }),
    });
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
    await purgePromotionsByNamePrefix(PROMO_PREFIX);
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('crear promo con variantId desde el form', async ({ page }) => {
    await page.goto('/promotions');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /nueva promoción/i }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByRole('heading', { name: /nueva promoción/i })).toBeVisible();

    await field(dlg, /^Nombre/).fill(`${PROMO_PREFIX}solo Talla L`);
    // Type ya viene por default PRODUCT_PERCENT_OFF — bien.
    // Scope: Producto específico
    await dlg.getByRole('button', { name: /producto específico/i }).click();

    // Esperar que se carguen los productos en el select
    const selects = dlg.locator('select');
    // Primer select es Tipo de promoción (ya seleccionado).
    // Segundo select es producto (aparece al elegir scope=product).
    // Esperamos a que el producto E2E aparezca como option.
    const productSelect = selects.nth(1);
    await expect
      .poll(async () =>
        productSelect.locator(`option[value="${parentId}"]`).count(),
      )
      .toBeGreaterThan(0);
    await productSelect.selectOption({ value: parentId });

    // Como el producto tiene variantes, debe aparecer el selector de variante
    const variantSelect = selects.nth(2);
    await expect(variantSelect).toBeVisible();
    await expect
      .poll(async () => variantSelect.locator(`option[value="${varLId}"]`).count())
      .toBeGreaterThan(0);
    await variantSelect.selectOption({ value: varLId });

    // Porcentaje 15%
    await field(dlg, /porcentaje de descuento/i).fill('15');

    await dlg.getByRole('button', { name: /crear promoción/i }).click();
    await expect(dlg).toBeHidden();

    // Verificación via API (endpoint paginado).
    const res = await api<{ items: Array<{ name: string; variantId: string | null; productId: string | null }> }>(
      '/promotions',
    );
    const promo = res.items.find((p) => p.name === `${PROMO_PREFIX}solo Talla L`);
    expect(promo).toBeDefined();
    expect(promo!.productId).toBe(parentId);
    expect(promo!.variantId).toBe(varLId);
  });
});
