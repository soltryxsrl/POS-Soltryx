import { expect, test } from './fixtures';
import {
  api,
  ensureCashSessionOpen,
  purgeProductsBySkuPrefix,
} from './helpers/api';

const SKU_PREFIX = 'E2E-CANCEL-';

test.describe.serial('Cancelar venta', () => {
  let regId = '';
  let kitId = '';
  let comp1Id = '';
  let comp2Id = '';
  let saleId = '';

  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    const sessId = await ensureCashSessionOpen();

    const reg = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Cancel Reg',
        sku: `${SKU_PREFIX}REG`,
        salePrice: '50.00',
        taxRate: '0.00',
        initialStock: '10',
      }),
    });
    regId = reg.id;

    const c1 = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Cancel Pan',
        sku: `${SKU_PREFIX}PAN`,
        salePrice: '10.00',
        taxRate: '0.00',
        initialStock: '20',
      }),
    });
    comp1Id = c1.id;
    const c2 = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Cancel Cafe',
        sku: `${SKU_PREFIX}CAFE`,
        salePrice: '20.00',
        taxRate: '0.00',
        initialStock: '20',
      }),
    });
    comp2Id = c2.id;
    const kit = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Cancel Combo',
        sku: `${SKU_PREFIX}COMBO`,
        salePrice: '60.00',
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

    // Crear venta via API: 1 regular + 1 kit
    const sale = await api<{ id: string }>('/sales', {
      method: 'POST',
      body: JSON.stringify({
        cashSessionId: sessId,
        items: [
          { productId: regId, quantity: '1' },
          { productId: kitId, quantity: '1' },
        ],
        payments: [{ method: 'CASH', amount: '200.00' }],
      }),
    });
    saleId = sale.id;
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('cancelar desde UI revierte stock (incluido kit explotado)', async ({
    page,
  }) => {
    // Stock antes de cancelar: reg=9, pan=18, cafe=19
    await page.goto(`/sales/${saleId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /^Venta /i })).toBeVisible();
    await page.getByRole('button', { name: /anular venta/i }).click();

    const dlg = page.getByRole('dialog');
    await expect(dlg.getByRole('heading', { name: /anular venta/i })).toBeVisible();
    // Field "Motivo" — usamos el primer input del dialog (no hay otros campos).
    await dlg.locator('input').first().fill('E2E test cancel');
    await dlg.getByRole('button', { name: /confirmar anulación/i }).click();

    // Esperamos que el botón de "Anular venta" desaparezca (porque el estado
    // cambió a CANCELLED y ya no se permite).
    await expect(page.getByRole('button', { name: /anular venta/i })).toBeHidden({
      timeout: 8_000,
    });

    // Verificación de stock via API: vuelta al estado original
    const reg = await api<{ stock: string }>(`/products/${regId}`);
    const pan = await api<{ stock: string }>(`/products/${comp1Id}`);
    const cafe = await api<{ stock: string }>(`/products/${comp2Id}`);
    expect(reg.stock).toBe('10.000');
    expect(pan.stock).toBe('20.000');
    expect(cafe.stock).toBe('20.000');
  });
});
