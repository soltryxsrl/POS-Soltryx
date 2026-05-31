import { expect, test } from './fixtures';
import { api, ensureCashSessionOpen, purgeProductsBySkuPrefix } from './helpers/api';

const SKU = 'E2E-INCL-';

async function setPriceIncludesTax(value: boolean): Promise<void> {
  const biz = await api<Record<string, unknown>>('/config/business');
  await api('/config/business', {
    method: 'PUT',
    body: JSON.stringify({ ...biz, priceIncludesTax: value }),
  });
}

test.describe.serial('ITBIS incluido', () => {
  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU);
    await ensureCashSessionOpen();
    await setPriceIncludesTax(true);
    await api('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Precio Bruto',
        sku: `${SKU}A`,
        salePrice: '118.00', // el precio YA incluye el 18%
        taxRate: '18.00',
        initialStock: '20',
      }),
    });
  });

  test.afterAll(async () => {
    await setPriceIncludesTax(false);
    await purgeProductsBySkuPrefix(SKU);
  });

  test('el total no suma el impuesto y el recibo desglosa "ITBIS incluido"', async ({
    page,
  }) => {
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');

    const search = page.getByPlaceholder(/busca por nombre/i);
    await search.fill(`${SKU}A`);
    await page.getByRole('button', { name: /E2E Precio Bruto/ }).first().click();

    const cart = page.locator('div.rounded-2xl').filter({
      has: page.getByRole('heading', { name: /^Carrito/ }),
    });
    await expect(cart.getByText('E2E Precio Bruto')).toBeVisible();
    // En modo incluido el carrito etiqueta el impuesto como "ITBIS incl."
    await expect(cart.getByText(/ITBIS incl\./i).first()).toBeVisible();

    await page.getByRole('button', { name: /^Cobrar/ }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByRole('heading', { name: /cobrar venta/i })).toBeVisible();
    await dlg.getByRole('button', { name: /confirmar venta/i }).click();

    await expect(
      page.getByRole('heading', { name: /venta procesada correctamente/i }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /ver detalle/i }).click();
    await page.waitForURL(/\/sales\/[^/]+$/, { timeout: 15_000 });

    const saleId = page.url().split('/').pop()!;
    const sale = await api<{
      subtotal: string;
      taxTotal: string;
      total: string;
      priceIncludesTax: boolean;
    }>(`/sales/${saleId}`);
    expect(sale.total).toBe('118.00'); // NO suma 18% encima
    expect(sale.taxTotal).toBe('18.00'); // back-calculado (118/1.18 = 100 neto)
    expect(sale.priceIncludesTax).toBe(true);

    // El recibo en pantalla lo muestra como incluido.
    await expect(page.getByText(/ITBIS incluido/i).first()).toBeVisible();
  });
});
