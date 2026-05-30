import { expect, test } from './fixtures';
import { api, purgeProductsBySkuPrefix } from './helpers/api';
import { field } from './helpers/selectors';

const SKU_PREFIX = 'E2E-PV-';

test.describe.serial('Productos y variantes', () => {
  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });
  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('crear producto regular desde la UI', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /nuevo producto/i }).click();

    // Diálogo abierto
    await expect(page.getByRole('heading', { name: /nuevo producto/i })).toBeVisible();

    const dialog = page.getByRole('dialog');
    await field(dialog, /^Nombre/).fill('E2E Producto Regular');
    await field(dialog, /^SKU/).fill(`${SKU_PREFIX}REG`);
    await field(dialog, /Precio venta/).fill('100.00');
    await field(dialog, /Stock inicial/).fill('25');

    await page.getByRole('button', { name: /crear producto/i }).click();

    // Diálogo se cierra y el producto aparece en la tabla
    await expect(page.getByRole('heading', { name: /nuevo producto/i })).toBeHidden();
    await expect(page.getByText('E2E Producto Regular')).toBeVisible();

    // Verificación contra DB via API
    const list = await api<{ items: Array<{ sku: string; stock: string; isKit: boolean }> }>(
      `/products?q=${SKU_PREFIX}REG`,
    );
    const row = list.items.find((p) => p.sku === `${SKU_PREFIX}REG`);
    expect(row).toBeDefined();
    expect(row!.stock).toBe('25.000');
    expect(row!.isKit).toBe(false);
  });

  test('crear producto con variantes y agregar 2 variantes', async ({ page }) => {
    // Producto padre creado via API para acelerar
    const parent = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Camisa',
        sku: `${SKU_PREFIX}CAMISA`,
        salePrice: '500.00',
        taxRate: '18.00',
      }),
    });

    await page.goto(`/products/${parent.id}`);
    await page.waitForLoadState('networkidle');

    // Sección "Variantes" visible (porque el producto NO es kit)
    await expect(page.getByRole('heading', { name: /^Variantes$/ })).toBeVisible();

    // Crear variante M
    await page.getByRole('button', { name: /nueva variante/i }).click();
    let dlg = page.getByRole('dialog');
    await expect(dlg.getByRole('heading', { name: /nueva variante/i })).toBeVisible();
    await field(dlg, /^Nombre/).fill('Talla M');
    await field(dlg, /^SKU/).fill(`${SKU_PREFIX}CAMISA-M`);
    await field(dlg, /Stock inicial/).fill('10');
    await dlg.getByRole('button', { name: /crear variante/i }).click();
    await expect(dlg).toBeHidden();

    // Crear variante L con precio override
    await page.getByRole('button', { name: /nueva variante/i }).click();
    dlg = page.getByRole('dialog');
    await field(dlg, /^Nombre/).fill('Talla L');
    await field(dlg, /^SKU/).fill(`${SKU_PREFIX}CAMISA-L`);
    await field(dlg, /Precio venta override/).fill('550.00');
    await field(dlg, /Stock inicial/).fill('8');
    await dlg.getByRole('button', { name: /crear variante/i }).click();
    await expect(dlg).toBeHidden();

    // Ambas filas visibles
    await expect(page.getByText('Talla M')).toBeVisible();
    await expect(page.getByText('Talla L')).toBeVisible();

    // Verificación via API
    const variants = await api<Array<{ name: string; sku: string; stock: string; salePrice: string | null }>>(
      `/products/${parent.id}/variants`,
    );
    expect(variants).toHaveLength(2);
    const m = variants.find((v) => v.name === 'Talla M')!;
    const l = variants.find((v) => v.name === 'Talla L')!;
    expect(m.stock).toBe('10.000');
    expect(m.salePrice).toBeNull();
    expect(l.stock).toBe('8.000');
    expect(l.salePrice).toBe('550.00');

    // El producto padre debe estar marcado hasVariants=true
    const parentRefreshed = await api<{ hasVariants: boolean }>(`/products/${parent.id}`);
    expect(parentRefreshed.hasVariants).toBe(true);
  });
});
