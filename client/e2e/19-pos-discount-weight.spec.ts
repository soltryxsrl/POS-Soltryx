import { expect, test } from './fixtures';
import { api, ensureCashSessionOpen, purgeProductsBySkuPrefix } from './helpers/api';

const SKU = 'E2E-DISCWT-';

test.describe.serial('Descuento en % y venta por peso', () => {
  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU);
    await ensureCashSessionOpen();
    await api('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Peso Queso',
        sku: `${SKU}A`,
        salePrice: '100.00',
        taxRate: '0.00', // exento → math limpia, independiente del modo de ITBIS
        initialStock: '100',
      }),
    });
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU);
  });

  test('cantidad decimal (2.5) + descuento de línea 10% → totales correctos', async ({
    page,
  }) => {
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');

    const search = page.getByPlaceholder(/busca por nombre/i);
    await search.fill(`${SKU}A`);
    await page.getByRole('button', { name: /E2E Peso Queso/ }).first().click();

    const cart = page.locator('div.rounded-2xl').filter({
      has: page.getByRole('heading', { name: /^Carrito/ }),
    });
    await expect(cart.getByText('E2E Peso Queso')).toBeVisible();

    // Cantidad por peso: 2.5
    await cart.getByLabel(/cantidad \(admite decimales/i).fill('2.5');

    // Descuento de línea en %: togglear unidad y poner 10
    await cart
      .getByRole('button', { name: /cambiar unidad del descuento de la l[ií]nea/i })
      .click();
    await cart.getByLabel(/descuento de la l[ií]nea en porcentaje/i).fill('10');

    // Cobrar (total esperado: 250 − 25 = 225.00)
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
      discountTotal: string;
      total: string;
      items: Array<{ quantity: string }>;
    }>(`/sales/${saleId}`);
    expect(sale.items[0].quantity).toBe('2.500');
    expect(sale.subtotal).toBe('250.00'); // 100 × 2.5
    expect(sale.discountTotal).toBe('25.00'); // 10% de 250
    expect(sale.total).toBe('225.00');
  });
});
