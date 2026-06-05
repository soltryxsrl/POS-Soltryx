import { expect, test } from './fixtures';
import { ensureCashSessionOpen, purgeProductsBySkuPrefix } from './helpers/api';

/**
 * Reportes — Análisis de datos. Tras la reestructuración, /reports es un ÍNDICE
 * (padre) y cada reporte vive en su propia ruta con su propia barra de filtros.
 * Estos tests SOLO LECTURA navegan a cada sub-ruta y verifican encabezados de
 * tabla / tarjetas (StatCard). Las tablas pueden estar vacías; solo se afirma la
 * presencia de encabezados/títulos.
 *
 * Las aserciones se acotan a <main> (contenido de la página) para no chocar con
 * los enlaces del sidebar (p.ej. "Devoluciones", "Inventario").
 */
const SKU_PREFIX = 'E2E-REPORTS-';

/** Tarjeta (div.rounded-lg) que contiene el <h3> con `title`. */
function cardByHeading(scope: import('@playwright/test').Locator, title: RegExp) {
  return scope
    .locator('div.rounded-lg')
    .filter({ has: scope.page().locator('h3', { hasText: title }) });
}

test.describe.serial('Reportes — Análisis de datos', () => {
  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    await ensureCashSessionOpen();
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('el índice de reportes lista las tarjetas de cada reporte', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    const main = page.locator('main');

    await expect(
      page.getByRole('heading', { name: /^reportes$/i, level: 1 }),
    ).toBeVisible();
    await expect(main.getByRole('link', { name: /detalle de ventas/i })).toBeVisible();
    await expect(main.getByRole('link', { name: /valuación de inventario/i })).toBeVisible();
    await expect(main.getByRole('link', { name: /historial de precios/i })).toBeVisible();
  });

  test('valuación de inventario: tarjetas + tabla por categoría', async ({ page }) => {
    await page.goto('/reports/valuation');
    await page.waitForLoadState('networkidle');
    const main = page.locator('main');

    await expect(main.getByText('Costo del inventario', { exact: true })).toBeVisible();
    await expect(main.getByText('Valor a precio de lista', { exact: true })).toBeVisible();
    await expect(main.getByText('Margen potencial', { exact: true })).toBeVisible();
    await expect(main.getByText('Unidades en stock', { exact: true })).toBeVisible();

    const valuationTable = cardByHeading(main, /valuación por categoría/i);
    await expect(valuationTable).toBeVisible();
    await expect(valuationTable.locator('th', { hasText: /categoría/i })).toBeVisible();
    await expect(valuationTable.locator('th', { hasText: /skus/i })).toBeVisible();
    await expect(valuationTable.locator('th', { hasText: /precio lista/i })).toBeVisible();
  });

  test('márgenes por producto: tabla con sus columnas', async ({ page }) => {
    await page.goto('/reports/margins');
    await page.waitForLoadState('networkidle');
    const main = page.locator('main');

    const marginsTable = cardByHeading(main, /margen por producto/i);
    await expect(marginsTable).toBeVisible();
    await expect(marginsTable.locator('th', { hasText: /producto/i })).toBeVisible();
    await expect(marginsTable.locator('th', { hasText: /vendido/i })).toBeVisible();
    await expect(marginsTable.locator('th', { hasText: /ingresos/i })).toBeVisible();
    await expect(marginsTable.locator('th', { hasText: /costo/i })).toBeVisible();
    await expect(marginsTable.locator('th', { hasText: /margen/i })).toBeVisible();
    await expect(marginsTable.locator('th').filter({ hasText: '%' })).toBeVisible();
  });

  test('ventas por categoría: tabla con sus columnas', async ({ page }) => {
    await page.goto('/reports/by-category');
    await page.waitForLoadState('networkidle');
    const main = page.locator('main');

    const categoryTable = cardByHeading(main, /ventas por categoría/i);
    await expect(categoryTable).toBeVisible();
    await expect(categoryTable.locator('th', { hasText: /categoría/i })).toBeVisible();
    await expect(categoryTable.locator('th', { hasText: /unidades/i })).toBeVisible();
    await expect(categoryTable.locator('th', { hasText: /ingresos/i })).toBeVisible();
  });

  test('devoluciones: tarjetas + tablas por método y razón', async ({ page }) => {
    await page.goto('/reports/returns');
    await page.waitForLoadState('networkidle');
    const main = page.locator('main');

    // "Devoluciones" es también el título de la página; verificamos las tarjetas
    // por sus labels únicos + las tablas por método/razón.
    await expect(main.getByText('Total devuelto', { exact: true })).toBeVisible();
    await expect(main.getByText('ITBIS devuelto', { exact: true })).toBeVisible();
    await expect(main.locator('h3', { hasText: /por método de reembolso/i })).toBeVisible();
    await expect(main.locator('h3', { hasText: /^por razón$/i })).toBeVisible();
  });

  test('lento movimiento: tabla de productos estancados', async ({ page }) => {
    await page.goto('/reports/slow-movers');
    await page.waitForLoadState('networkidle');
    const main = page.locator('main');

    const slowMoversTable = cardByHeading(main, /lento movimiento/i);
    await expect(slowMoversTable).toBeVisible();
    await expect(slowMoversTable.locator('th', { hasText: /producto/i })).toBeVisible();
    await expect(slowMoversTable.locator('th', { hasText: /categoría/i })).toBeVisible();
    await expect(slowMoversTable.locator('th', { hasText: /stock/i })).toBeVisible();
    await expect(slowMoversTable.locator('th', { hasText: /capital/i })).toBeVisible();
    await expect(slowMoversTable.locator('th', { hasText: /última venta/i })).toBeVisible();
  });

  test('cada sub-reporte tiene su propia barra: toggle consolidado en valuación', async ({
    page,
  }) => {
    await page.goto('/reports/valuation');
    await page.waitForLoadState('networkidle');

    const consolidadoSwitch = page.getByRole('switch', { name: /consolidado.*sucursales/i });
    await expect(consolidadoSwitch).toBeVisible();
    await expect(consolidadoSwitch).toHaveAttribute('aria-checked', 'false');
    await consolidadoSwitch.click();
    await expect(consolidadoSwitch).toHaveAttribute('aria-checked', 'true');
    await page.waitForLoadState('networkidle');
  });

  test('la barra de rango actualiza el reporte (márgenes)', async ({ page }) => {
    await page.goto('/reports/margins');
    await page.waitForLoadState('networkidle');
    const main = page.locator('main');

    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs).toHaveCount(2);

    const fromInput = dateInputs.nth(0);
    const fromValue = await fromInput.inputValue();
    expect(fromValue).toBeTruthy();

    const dateParts = fromValue.split('-');
    const currentDay = parseInt(dateParts[2], 10);
    dateParts[2] = String(Math.max(currentDay - 1, 1)).padStart(2, '0');
    const newDate = dateParts.join('-');

    await fromInput.fill(newDate);
    await expect(fromInput).toHaveValue(newDate);
    await page.waitForLoadState('networkidle');

    const marginsTable = cardByHeading(main, /margen por producto/i);
    await expect(marginsTable).toBeVisible();
    await expect(marginsTable.locator('th', { hasText: /producto/i })).toBeVisible();
  });
});
