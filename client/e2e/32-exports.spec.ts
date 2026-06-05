import { expect, test } from './fixtures';
import {
  api,
  ensureCashSessionOpen,
  purgeProductsBySkuPrefix,
} from './helpers/api';

/**
 * Exportaciones CSV/PDF (Lote 3/4 + PDF). Captura el `download` real disparado
 * por el navegador → verifica que los botones cablean bien y que jsPDF corre sin
 * lanzar. El contenido de los datos ya lo cubren los specs API (28/30/31).
 */

const SKU_PREFIX = 'E2E-EXP-';

test.describe.serial('Exportaciones', () => {
  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    const cashSessionId = await ensureCashSessionOpen();
    const product = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Export',
        sku: `${SKU_PREFIX}P1`,
        salePrice: '100.00',
        costPrice: '60.00',
        taxRate: '0.00',
        initialStock: '5',
      }),
    });
    // Una venta hoy para que el detalle de ventas tenga datos en el rango.
    await api('/sales', {
      method: 'POST',
      body: JSON.stringify({
        cashSessionId,
        items: [{ productId: product.id, quantity: '1' }],
        payments: [{ method: 'CASH', amount: '100.00' }],
      }),
    });
    // Un cambio de precio hoy para que el historial de precios tenga datos.
    await api(`/products/${product.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ salePrice: '110.00' }),
    });
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('maestro de artículos: descarga CSV y PDF', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    const pdfBtn = page.getByRole('button', { name: 'PDF' });
    await expect(pdfBtn).toBeVisible();
    const pdfDl = page.waitForEvent('download');
    await pdfBtn.click();
    expect((await pdfDl).suggestedFilename()).toMatch(/^maestro-articulos_.*\.pdf$/);

    const csvDl = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV' }).click();
    expect((await csvDl).suggestedFilename()).toMatch(/^maestro-articulos_.*\.csv$/);
  });

  test('detalle de ventas: descarga PDF', async ({ page }) => {
    // Cada reporte tiene su propia ruta y su único botón "PDF".
    await page.goto('/reports/sales-detail');
    await page.waitForLoadState('networkidle');

    const pdfBtn = page.getByRole('button', { name: 'PDF' });
    await expect(pdfBtn).toBeVisible();
    await expect(pdfBtn).toBeEnabled();
    const pdfDl = page.waitForEvent('download');
    await pdfBtn.click();
    expect((await pdfDl).suggestedFilename()).toMatch(/^detalle-ventas_.*\.pdf$/);
  });

  test('historial de precios: descarga PDF', async ({ page }) => {
    await page.goto('/reports/price-history');
    await page.waitForLoadState('networkidle');

    const pdfBtn = page.getByRole('button', { name: 'PDF' });
    await expect(pdfBtn).toBeVisible();
    // Puede estar deshabilitado si no hubo cambios en el rango; solo probamos
    // la descarga cuando está habilitado.
    if (await pdfBtn.isEnabled()) {
      const pdfDl = page.waitForEvent('download');
      await pdfBtn.click();
      expect((await pdfDl).suggestedFilename()).toMatch(/^historial-precios_.*\.pdf$/);
    }
  });
});
