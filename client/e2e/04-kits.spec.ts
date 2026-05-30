import { expect, test } from './fixtures';
import { api, purgeProductsBySkuPrefix } from './helpers/api';

const SKU_PREFIX = 'E2E-KIT-';

test.describe.serial('Kits / Combos', () => {
  let comp1Id = '';
  let comp2Id = '';
  let kitId = '';

  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    const c1 = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Pan',
        sku: `${SKU_PREFIX}PAN`,
        salePrice: '20.00',
        taxRate: '0.00',
        initialStock: '100',
      }),
    });
    comp1Id = c1.id;
    const c2 = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Cafe',
        sku: `${SKU_PREFIX}CAFE`,
        salePrice: '40.00',
        taxRate: '0.00',
        initialStock: '100',
      }),
    });
    comp2Id = c2.id;
    const kit = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Combo',
        sku: `${SKU_PREFIX}COMBO`,
        salePrice: '100.00',
        taxRate: '0.00',
        isKit: true,
      }),
    });
    kitId = kit.id;
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('setear receta del kit desde la ficha del producto', async ({ page }) => {
    await page.goto(`/products/${kitId}`);
    await page.waitForLoadState('networkidle');

    // Sección "Componentes del kit" visible (porque isKit=true)
    await expect(page.getByRole('heading', { name: /componentes del kit/i })).toBeVisible();
    const kitSection = page.locator('section').filter({
      has: page.getByRole('heading', { name: /componentes del kit/i }),
    });

    // Agregar 1 componente para que aparezca el primer select
    await kitSection.getByRole('button', { name: /agregar componente/i }).click();

    // Esperar que los productos hayan cargado en el primer select
    const firstSelect = kitSection.locator('select').first();
    await expect
      .poll(async () => firstSelect.locator(`option[value="${comp1Id}"]`).count())
      .toBeGreaterThan(0);

    // Agregar la segunda fila
    await kitSection.getByRole('button', { name: /agregar componente/i }).click();

    const selects = kitSection.locator('select');
    await expect(selects).toHaveCount(2);
    await selects.nth(0).selectOption({ value: comp1Id });
    await selects.nth(1).selectOption({ value: comp2Id });

    // Cantidades: el componente Pan = 2, Cafe = 1
    const qtyInputs = kitSection.locator('input[inputmode="decimal"]');
    await qtyInputs.nth(0).fill('2');
    await qtyInputs.nth(1).fill('1');

    await kitSection.getByRole('button', { name: /guardar receta/i }).click();

    // Esperar a que la mutación complete y el botón vuelva a "Guardar receta"
    // (sin "Guardando..." y deshabilitado por rows=null).
    await expect(
      kitSection.getByRole('button', { name: /guardando/i }),
    ).toBeHidden();

    // Verificación vs API: la receta debe tener PAN=2 y CAFE=1
    const recipe = await api<Array<{ componentProductId: string; quantity: string }>>(
      `/products/${kitId}/kit-components`,
    );
    expect(recipe).toHaveLength(2);
    const pan = recipe.find((r) => r.componentProductId === comp1Id)!;
    const cafe = recipe.find((r) => r.componentProductId === comp2Id)!;
    expect(pan.quantity).toBe('2.000');
    expect(cafe.quantity).toBe('1.000');
  });
});
