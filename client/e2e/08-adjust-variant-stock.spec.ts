import { expect, test } from './fixtures';
import { api, purgeProductsBySkuPrefix } from './helpers/api';
import { field } from './helpers/selectors';

const SKU_PREFIX = 'E2E-ADJ-';

test.describe.serial('Ajuste de stock por variante', () => {
  let parentId = '';
  let varId = '';

  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    const parent = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Adj Camisa',
        sku: `${SKU_PREFIX}CAMISA`,
        salePrice: '500.00',
        taxRate: '0.00',
      }),
    });
    parentId = parent.id;
    const v = await api<{ id: string }>(`/products/${parentId}/variants`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Talla M',
        sku: `${SKU_PREFIX}CAMISA-M`,
        initialStock: '5',
      }),
    });
    varId = v.id;
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('ajustar +3 a la variante desde su row', async ({ page }) => {
    await page.goto(`/products/${parentId}`);
    await page.waitForLoadState('networkidle');

    // Encontrar la fila de la variante "Talla M" y hacer click en "Ajustar stock"
    const variantRow = page
      .locator('tr')
      .filter({ hasText: 'Talla M' });
    await variantRow.getByRole('button', { name: /ajustar stock/i }).click();

    const dlg = page.getByRole('dialog');
    await expect(
      dlg.getByRole('heading', { name: /ajustar stock.*Talla M/i }),
    ).toBeVisible();

    // El input está prellenado en "+0". Lo cambiamos a "+5" tecleando.
    const qty = field(dlg, /^Cantidad/);
    await qty.fill('+5');
    await field(dlg, /^Motivo/).fill('E2E ajuste de prueba');
    await dlg.getByRole('button', { name: /aplicar ajuste/i }).click();
    await expect(dlg).toBeHidden();

    // Stock de variante debe ser 10
    const variants = await api<Array<{ id: string; stock: string }>>(
      `/products/${parentId}/variants`,
    );
    const v = variants.find((x) => x.id === varId)!;
    expect(v.stock).toBe('10.000');
  });
});
