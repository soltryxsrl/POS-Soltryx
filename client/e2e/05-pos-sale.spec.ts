import { expect, test } from './fixtures';
import {
  api,
  deactivateUsd,
  ensureCashSessionOpen,
  ensureUsdActiveAtRate,
  purgeProductsBySkuPrefix,
} from './helpers/api';

const SKU_PREFIX = 'E2E-POS-';

test.describe.serial('POS — venta completa', () => {
  let regId = '';
  let varParentId = '';
  let varLId = '';
  let kitId = '';
  let comp1Id = '';
  let comp2Id = '';

  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    await ensureUsdActiveAtRate('60.00');
    await ensureCashSessionOpen();

    // Producto regular
    const reg = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E POS Regular',
        sku: `${SKU_PREFIX}REG`,
        salePrice: '50.00',
        taxRate: '18.00',
        initialStock: '20',
      }),
    });
    regId = reg.id;

    // Producto con variantes
    const varParent = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E POS Camisa',
        sku: `${SKU_PREFIX}CAMISA`,
        salePrice: '500.00',
        taxRate: '18.00',
      }),
    });
    varParentId = varParent.id;
    await api(`/products/${varParentId}/variants`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Talla M',
        sku: `${SKU_PREFIX}CAMISA-M`,
        initialStock: '10',
      }),
    });
    const varL = await api<{ id: string }>(`/products/${varParentId}/variants`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Talla L',
        sku: `${SKU_PREFIX}CAMISA-L`,
        salePrice: '550.00',
        initialStock: '8',
      }),
    });
    varLId = varL.id;

    // Kit
    const comp1 = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E POS Pan',
        sku: `${SKU_PREFIX}PAN`,
        salePrice: '20.00',
        taxRate: '0.00',
        initialStock: '50',
      }),
    });
    comp1Id = comp1.id;
    const comp2 = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E POS Cafe',
        sku: `${SKU_PREFIX}CAFE`,
        salePrice: '40.00',
        taxRate: '0.00',
        initialStock: '50',
      }),
    });
    comp2Id = comp2.id;
    const kit = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E POS Combo',
        sku: `${SKU_PREFIX}COMBO`,
        salePrice: '100.00',
        taxRate: '0.00',
        isKit: true,
      }),
    });
    kitId = kit.id;
    await api(`/products/${kitId}/kit-components`, {
      method: 'POST',
      body: JSON.stringify({
        components: [
          { productId: comp1Id, quantity: '2' },
          { productId: comp2Id, quantity: '1' },
        ],
      }),
    });
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    await deactivateUsd();
  });

  test('venta con regular + variante L + kit, pago mixto USD + DOP', async ({
    page,
  }) => {
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');

    const search = page.getByPlaceholder(/busca por nombre/i);
    await expect(search).toBeVisible();

    // El carrito vive en un div con clase `rounded-2xl border ...` (el rediseño
    // del POS subió el radio). Lo localizamos por su encabezado.
    const cart = page.locator('div.rounded-2xl').filter({
      has: page.getByRole('heading', { name: /^Carrito/ }),
    });

    // 1) Agregar producto regular
    await search.fill(`${SKU_PREFIX}REG`);
    await page.getByRole('button', { name: /E2E POS Regular/ }).click();
    await expect(cart.getByText('E2E POS Regular')).toBeVisible();

    // 2) Agregar variante L del producto con variantes
    await search.fill('');
    await search.fill(`${SKU_PREFIX}CAMISA`);
    await page.getByRole('button', { name: /E2E POS Camisa/ }).first().click();
    // Abre el VariantPicker
    await expect(
      page.getByRole('heading', { name: /Variantes · E2E POS Camisa/ }),
    ).toBeVisible();
    await page.getByRole('button', { name: /Talla L/ }).click();
    await expect(
      page.getByRole('heading', { name: /Variantes · E2E POS Camisa/ }),
    ).toBeHidden();
    await expect(cart.getByText(/E2E POS Camisa.*Talla L/)).toBeVisible();

    // 3) Agregar kit
    await search.fill('');
    await search.fill(`${SKU_PREFIX}COMBO`);
    await page.getByRole('button', { name: /E2E POS Combo/ }).first().click();
    await expect(cart.getByText('E2E POS Combo')).toBeVisible();

    // 4) Cobrar (el botón ahora incluye el hint "F2" dentro del span).
    await page.getByRole('button', { name: /^Cobrar/ }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByRole('heading', { name: /Cobrar venta/ })).toBeVisible();

    // Esperamos al selector de moneda del primer pago. El dialog ahora tiene
    // un primer <select> de tipo de comprobante fiscal; filtramos por el que
    // contiene la opción "USD".
    const currencySelects = dlg.locator('select').filter({ hasText: 'USD' });
    await expect(currencySelects.first()).toBeVisible({ timeout: 8_000 });

    // Cambiar primer tender a USD, monto 10 USD (= 600 DOP)
    await currencySelects.first().selectOption('USD');
    const amountInputs = dlg.locator('input[inputmode="decimal"]');
    await amountInputs.first().fill('10');

    // Segundo tender: DOP por defecto, cubre el resto generosamente
    await dlg.getByRole('button', { name: /agregar otro pago/i }).click();
    // Después de agregar, hay 2 inputs de monto; rellenamos el segundo
    await expect(amountInputs).toHaveCount(2, { timeout: 5_000 });
    await amountInputs.nth(1).fill('1000');

    // 5) Confirmar
    await dlg.getByRole('button', { name: /confirmar venta/i }).click();

    // 6) Tras el cobro el drawer muestra una vista de éxito con acciones
    //    rápidas; "Ver detalle" navega al detalle de la venta.
    await expect(
      page.getByRole('heading', { name: /venta procesada correctamente/i }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /ver detalle/i }).click();
    await page.waitForURL(/\/sales\/[^/]+$/, { timeout: 15_000 });

    // 7) Receipt visible con los items
    await expect(page.getByText('E2E POS Regular').first()).toBeVisible();
    await expect(page.getByText(/E2E POS Camisa.*Talla L/).first()).toBeVisible();
    await expect(page.getByText('E2E POS Combo').first()).toBeVisible();

    // 8) Receipt menciona pago en USD
    await expect(page.getByText(/Pagado: USD.*@.*60/).first()).toBeVisible();

    // 9) Verificación de stock via API
    const saleUrl = page.url();
    const saleId = saleUrl.split('/').pop()!;
    const saleData = await api<{
      payments: Array<{ currencyCode: string; foreignAmount: string | null; amount: string }>;
      items: Array<{ productId: string; variantId: string | null; quantity: string }>;
    }>(`/sales/${saleId}`);
    expect(saleData.items).toHaveLength(3);
    const variantLine = saleData.items.find((i) => i.variantId === varLId);
    expect(variantLine).toBeDefined();
    const usdPayment = saleData.payments.find((p) => p.currencyCode === 'USD');
    expect(usdPayment).toBeDefined();
    expect(usdPayment!.foreignAmount).toBe('10.00');
    expect(usdPayment!.amount).toBe('600.00'); // 10 USD * 60 DOP

    // Stock checks
    const reg = await api<{ stock: string }>(`/products/${regId}`);
    expect(reg.stock).toBe('19.000');
    const varL = await api<Array<{ id: string; stock: string }>>(
      `/products/${varParentId}/variants`,
    );
    expect(varL.find((v) => v.id === varLId)!.stock).toBe('7.000');
    const pan = await api<{ stock: string }>(`/products/${comp1Id}`);
    const cafe = await api<{ stock: string }>(`/products/${comp2Id}`);
    expect(pan.stock).toBe('48.000');
    expect(cafe.stock).toBe('49.000');
  });
});
