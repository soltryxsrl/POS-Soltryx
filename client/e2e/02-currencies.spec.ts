import { expect, test } from './fixtures';
import { deactivateUsd } from './helpers/api';

test.describe('Monedas y tasas', () => {
  test.afterAll(async () => {
    // Volvemos USD a inactiva al final para no contaminar otros tests que
    // no esperan tener moneda extranjera activa.
    await deactivateUsd();
  });

  test('listar, cambiar tasa de USD y activarla', async ({ page }) => {
    await page.goto('/admin/monedas');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /monedas y tasas/i })).toBeVisible();

    // Las filas tienen el código de moneda como badge (span dentro de la primera
    // celda). Filtramos por eso para no matchear "DOP" dentro del texto
    // "1 USD = X.XX DOP" de la fila USD.
    const dopRow = page
      .getByRole('row')
      .filter({ has: page.locator('span', { hasText: /^DOP$/ }) });
    await expect(dopRow).toBeVisible();
    await expect(dopRow.getByText('Base', { exact: true })).toBeVisible();

    const usdRow = page
      .getByRole('row')
      .filter({ has: page.locator('span', { hasText: /^USD$/ }) });
    await expect(usdRow).toBeVisible();

    // Abrir diálogo de tasa
    await usdRow.getByRole('button', { name: /^tasa$/i }).click();

    // Esperamos el diálogo
    await expect(
      page.getByRole('heading', { name: /tasa de cambio · USD/i }),
    ).toBeVisible();

    // Cambiar la tasa
    const rateInput = page.getByRole('textbox', { name: /1 USD = \? DOP/i }).or(
      page.locator('input[placeholder="63.50"]'),
    );
    await rateInput.fill('61.50');
    await page.getByRole('button', { name: /actualizar tasa/i }).click();

    // El diálogo se cierra y la tabla refresca con la nueva tasa
    await expect(
      page.getByRole('heading', { name: /tasa de cambio · USD/i }),
    ).toBeHidden();
    await expect(usdRow).toContainText('61.50');

    // Activar USD si aún no está activa
    const activateBtn = usdRow.getByRole('button', { name: /^activar$/i });
    if (await activateBtn.isVisible()) {
      await activateBtn.click();
    }
    // El badge "Activa" (exact, sin Inactiva ni botón Activar)
    await expect(usdRow.getByText(/^Activa$/)).toBeVisible();
  });
});
