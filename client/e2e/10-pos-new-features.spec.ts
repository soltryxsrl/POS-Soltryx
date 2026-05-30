import { expect, test } from './fixtures';
import {
  api,
  ensureCashSessionOpen,
  purgeMyParkedCarts,
  purgeProductsBySkuPrefix,
} from './helpers/api';

const SKU_PREFIX = 'E2E-NEW-';
const IMG_URL = 'https://placehold.co/120x120.png?text=test';

test.describe.serial('POS — features nuevas (imagen, notas por línea, override descuento)', () => {
  let productId = '';

  test.beforeAll(async () => {
    await purgeMyParkedCarts();
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    await ensureCashSessionOpen();

    const p = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E New Producto',
        sku: `${SKU_PREFIX}P1`,
        salePrice: '100.00',
        taxRate: '0.00',
        initialStock: '50',
      }),
    });
    productId = p.id;

    await api('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E New Con Imagen',
        sku: `${SKU_PREFIX}IMG`,
        salePrice: '80.00',
        taxRate: '0.00',
        initialStock: '20',
        imageUrl: IMG_URL,
      }),
    });
  });

  test.afterAll(async () => {
    await purgeMyParkedCarts();
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('imagen URL se persiste y se renderiza en el tile del POS', async ({ page }) => {
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');

    const search = page.getByPlaceholder(/busca por nombre/i);
    await search.fill(`${SKU_PREFIX}IMG`);

    const tile = page.getByRole('button', { name: /E2E New Con Imagen/ });
    await expect(tile).toBeVisible();
    // El tile incluye un <img> con el src exacto que mandamos al crear el producto.
    await expect(tile.locator('img')).toHaveAttribute('src', IMG_URL);
  });

  test('nota por línea persiste al estacionar y retomar el carrito', async ({ page }) => {
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');

    const search = page.getByPlaceholder(/busca por nombre/i);
    await search.fill(`${SKU_PREFIX}P1`);
    await page.getByRole('button', { name: /E2E New Producto/ }).first().click();

    // Añadir nota a la línea
    await page.getByRole('button', { name: /agregar nota/i }).click();
    const noteInput = page.locator('input[aria-label*="Nota para la línea"]');
    await noteInput.fill('sin sal por favor');

    // Estacionar
    await page.getByRole('button', { name: /guardar para después/i }).click();
    const parkDlg = page.getByRole('dialog');
    await expect(
      parkDlg.getByRole('heading', { name: /guardar carrito para después/i }),
    ).toBeVisible();
    await parkDlg.getByRole('button', { name: /guardar carrito/i }).click();
    await expect(parkDlg).toBeHidden();

    // El cart quedó vacío
    await expect(page.getByText(/Carrito vacío/i)).toBeVisible();

    // Retomar desde el drawer "En espera"
    await page.getByRole('button', { name: /en espera/i }).click();
    const drawer = page.getByRole('dialog');
    await expect(
      drawer.getByRole('heading', { name: /carritos en espera/i }),
    ).toBeVisible();
    await drawer.getByRole('button', { name: /retomar/i }).click();

    // La nota persistió en la línea retomada
    await expect(
      page.locator('input[aria-label*="Nota para la línea"]'),
    ).toHaveValue('sin sal por favor');
  });

  test('descuento sobre el umbral auto-autoriza para admin y se guarda snapshot', async ({
    page,
  }) => {
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');

    const search = page.getByPlaceholder(/busca por nombre/i);
    await search.fill(`${SKU_PREFIX}P1`);
    await page.getByRole('button', { name: /E2E New Producto/ }).first().click();

    // Subtotal $100. Descuento orden $30 = 30% → supera umbral 15%.
    await page.locator('#order-discount-input').fill('30');

    // El warning preventivo aparece en el carrito.
    await expect(page.getByText(/supera el umbral/i)).toBeVisible();

    // Cobrar
    await page.getByRole('button', { name: /^Cobrar/ }).click();
    const dlg = page.getByRole('dialog');
    await expect(
      dlg.getByRole('heading', { name: /cobrar venta/i }),
    ).toBeVisible();

    // Pagar exacto (total = 100 - 30 = 70)
    const amountInputs = dlg.locator('input[inputmode="decimal"]');
    await amountInputs.first().fill('70');

    await dlg.getByRole('button', { name: /confirmar venta/i }).click();

    // Admin tiene `sales.discount.override` → no se dispara el dialog del
    // manager; va directo a la pantalla de éxito.
    await expect(
      page.getByRole('heading', { name: /venta procesada correctamente/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Verificación via API: snapshot del autorizador grabado.
    await page.getByRole('button', { name: /ver detalle/i }).click();
    await page.waitForURL(/\/sales\/[^/]+$/);
    const saleId = page.url().split('/').pop()!;
    const sale = await api<{
      orderDiscount: string;
      discountAuthorizedById: string | null;
      discountAuthorizedBySnapshot: string | null;
    }>(`/sales/${saleId}`);
    expect(sale.orderDiscount).toBe('30.00');
    expect(sale.discountAuthorizedById).not.toBeNull();
    expect(sale.discountAuthorizedBySnapshot).toBe('Administrador');

    // Y el receipt en pantalla lo muestra textualmente.
    await expect(
      page.getByText(/desc\. autorizado por: administrador/i),
    ).toBeVisible();
  });
});
