import { expect, test } from './fixtures';
import { ensureCashSessionOpen, purgeProductsBySkuPrefix } from './helpers/api';

/**
 * Reportes — Análisis de datos (página /reports).
 *
 * Estos tests son de SOLO LECTURA: navegan a /reports y verifican que las
 * tarjetas (StatCard), encabezados de tabla y el toggle "Consolidado" se
 * rendericen con los textos REALES del DOM. Las tablas pueden estar vacías
 * (sin ventas/devoluciones en el rango) y los tests lo toleran: solo afirman
 * la presencia de encabezados / títulos, no de filas de datos concretas.
 *
 * Nota sobre selectores:
 *  - Los labels de StatCard se renderizan con la capitalización del JSX
 *    ("Devoluciones", "ITBIS devuelto"), no en minúsculas. Por eso TODOS los
 *    getByText usan el flag `i` (case-insensitive). El bug original usaba
 *    /^devoluciones$/ (case-sensitive) y nunca encontraba "Devoluciones".
 *  - Las tablas viven dentro de un `div.rounded-lg.border.bg-card` cuyo primer
 *    hijo es el <h3> con el título. Localizamos esa tarjeta por el h3 y
 *    buscamos su <table> interna (más robusto que `.locator('..')`).
 */
const SKU_PREFIX = 'E2E-REPORTS-';

/** Tarjeta (div.rounded-lg) que contiene el <h3> con `title`. */
function cardByHeading(scope: import('@playwright/test').Locator, title: RegExp) {
  return scope
    .locator('div.rounded-lg')
    .filter({ has: scope.page().locator('h3', { hasText: title }) });
}

test.describe.serial('Reportes — Análisis de datos (5 reportes nuevos)', () => {
  test.beforeAll(async () => {
    // Limpieza defensiva por prefijo (este spec no crea productos, pero
    // mantenemos el patrón de aislamiento por SKU prefix).
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    // Garantiza una sesión de caja abierta para que la página renderice
    // de forma consistente (algunos widgets dependen de la sesión activa).
    await ensureCashSessionOpen();
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('página de reportes carga y muestra el encabezado y el toggle consolidado', async ({
    page,
  }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Encabezado principal (h1 "Reportes"). El breadcrumb "Reportes" es un
    // <span>, no un heading, así que el filtro por role=heading es inequívoco.
    await expect(
      page.getByRole('heading', { name: /^reportes$/i, level: 1 }),
    ).toBeVisible();

    // Toggle "Consolidado (todas las sucursales)" — Switch = button[role=switch]
    // (no checkbox). Solo visible si el usuario tiene branches.switch (admin lo
    // tiene en el seed). Su nombre accesible viene del <span> label.
    const consolidadoSwitch = page.getByRole('switch', {
      name: /consolidado.*sucursales/i,
    });
    await expect(consolidadoSwitch).toBeVisible();
  });

  test('valuación de inventario carga y muestra tarjetas de datos', async ({
    page,
  }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Sección de inventario (<h2> "Inventario", nivel 2)
    await expect(
      page.getByRole('heading', { name: /^inventario$/i, level: 2 }),
    ).toBeVisible();

    const inventorySection = page.locator('section').filter({
      has: page.locator('h2', { hasText: /^inventario$/i }),
    });
    await expect(inventorySection).toBeVisible();

    // Tarjetas de valuación (StatCard) — labels exactos del componente
    await expect(inventorySection.getByText(/costo del inventario/i)).toBeVisible();
    await expect(
      inventorySection.getByText(/valor a precio de lista/i),
    ).toBeVisible();
    await expect(inventorySection.getByText(/margen potencial/i)).toBeVisible();
    await expect(inventorySection.getByText(/unidades en stock/i)).toBeVisible();

    // Tabla "Valuación por categoría"
    const valuationTable = cardByHeading(
      inventorySection,
      /valuación por categoría/i,
    );
    await expect(valuationTable).toBeVisible();
    await expect(
      valuationTable.locator('th', { hasText: /categoría/i }),
    ).toBeVisible();
    await expect(valuationTable.locator('th', { hasText: /skus/i })).toBeVisible();
    await expect(
      valuationTable.locator('th', { hasText: /precio lista/i }),
    ).toBeVisible();
  });

  test('márgenes por producto carga y muestra tabla de márgenes', async ({
    page,
  }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Sección Rango
    const rangeSection = page.locator('section').filter({
      has: page.locator('h2', { hasText: /^rango$/i }),
    });
    await expect(rangeSection).toBeVisible();

    // Tabla "Margen por producto (costo actual aprox.)"
    const marginsTable = cardByHeading(rangeSection, /margen por producto/i);
    await expect(marginsTable).toBeVisible();

    // Encabezados de columna (textos reales del DOM)
    await expect(
      marginsTable.locator('th', { hasText: /producto/i }),
    ).toBeVisible();
    await expect(
      marginsTable.locator('th', { hasText: /vendido/i }),
    ).toBeVisible();
    await expect(
      marginsTable.locator('th', { hasText: /ingresos/i }),
    ).toBeVisible();
    await expect(marginsTable.locator('th', { hasText: /costo/i })).toBeVisible();
    await expect(marginsTable.locator('th', { hasText: /margen/i })).toBeVisible();
    // Columna "%": <th>%</th> exacto.
    await expect(
      marginsTable.locator('th').filter({ hasText: '%' }),
    ).toBeVisible();
  });

  test('ventas por categoría carga y muestra tabla de categorías', async ({
    page,
  }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    const rangeSection = page.locator('section').filter({
      has: page.locator('h2', { hasText: /^rango$/i }),
    });

    // Tabla "Ventas por categoría"
    const categoryTable = cardByHeading(rangeSection, /ventas por categoría/i);
    await expect(categoryTable).toBeVisible();

    await expect(
      categoryTable.locator('th', { hasText: /categoría/i }),
    ).toBeVisible();
    await expect(
      categoryTable.locator('th', { hasText: /unidades/i }),
    ).toBeVisible();
    await expect(
      categoryTable.locator('th', { hasText: /ingresos/i }),
    ).toBeVisible();
  });

  test('análisis de devoluciones carga y muestra tarjetas y tablas', async ({
    page,
  }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    const rangeSection = page.locator('section').filter({
      has: page.locator('h2', { hasText: /^rango$/i }),
    });

    // Tarjetas de devoluciones (StatCard). Los labels conservan su
    // capitalización del JSX: "Devoluciones", "Total devuelto", "ITBIS devuelto".
    // Por eso usamos el flag `i` (el bug original era /^devoluciones$/ sin `i`).
    await expect(
      rangeSection.getByText('Devoluciones', { exact: true }),
    ).toBeVisible();
    await expect(rangeSection.getByText(/total devuelto/i)).toBeVisible();
    await expect(rangeSection.getByText(/itbis devuelto/i)).toBeVisible();

    // Tablas de análisis de devoluciones (títulos en <h3>).
    await expect(
      rangeSection.locator('h3', { hasText: /por método de reembolso/i }),
    ).toBeVisible();
    await expect(
      rangeSection.locator('h3', { hasText: /^por razón$/i }),
    ).toBeVisible();
  });

  test('lento movimiento (slow movers) carga y muestra tabla de productos estancados', async ({
    page,
  }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    const inventorySection = page.locator('section').filter({
      has: page.locator('h2', { hasText: /^inventario$/i }),
    });

    // Tabla "Lento movimiento (sin venta en 30 días)"
    const slowMoversTable = cardByHeading(inventorySection, /lento movimiento/i);
    await expect(slowMoversTable).toBeVisible();

    await expect(
      slowMoversTable.locator('th', { hasText: /producto/i }),
    ).toBeVisible();
    await expect(
      slowMoversTable.locator('th', { hasText: /categoría/i }),
    ).toBeVisible();
    await expect(
      slowMoversTable.locator('th', { hasText: /stock/i }),
    ).toBeVisible();
    await expect(
      slowMoversTable.locator('th', { hasText: /capital/i }),
    ).toBeVisible();
    await expect(
      slowMoversTable.locator('th', { hasText: /última venta/i }),
    ).toBeVisible();
  });

  test('toggle consolidado cambia vista entre sucursal activa y todas las sucursales', async ({
    page,
  }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    const consolidadoSwitch = page.getByRole('switch', {
      name: /consolidado.*sucursales/i,
    });
    await expect(consolidadoSwitch).toBeVisible();

    // Inicia en unchecked (sucursal activa)
    await expect(consolidadoSwitch).toHaveAttribute('aria-checked', 'false');

    // Activar consolidado
    await consolidadoSwitch.click();
    await expect(consolidadoSwitch).toHaveAttribute('aria-checked', 'true');
    await page.waitForLoadState('networkidle');

    // Desactivar
    await consolidadoSwitch.click();
    await expect(consolidadoSwitch).toHaveAttribute('aria-checked', 'false');
    await page.waitForLoadState('networkidle');
  });

  test('rangos de fechas actualizan los reportes (margenes, ventas, devoluciones)', async ({
    page,
  }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    const rangeSection = page.locator('section').filter({
      has: page.locator('h2', { hasText: /^rango$/i }),
    });
    await expect(rangeSection).toBeVisible();

    // Inputs de fecha "Desde" y "Hasta" dentro de la sección Rango.
    const dateInputs = rangeSection.locator('input[type="date"]');
    await expect(dateInputs).toHaveCount(2);

    const fromInput = dateInputs.nth(0);
    const fromValue = await fromInput.inputValue();
    expect(fromValue).toBeTruthy();

    // Ampliar el rango hacia atrás (día -1, mínimo 01) para forzar refetch.
    const dateParts = fromValue.split('-');
    const currentDay = parseInt(dateParts[2], 10);
    const newDay = String(Math.max(currentDay - 1, 1)).padStart(2, '0');
    dateParts[2] = newDay;
    const newDate = dateParts.join('-');

    await fromInput.fill(newDate);
    await expect(fromInput).toHaveValue(newDate);
    await page.waitForLoadState('networkidle');

    // Tras el refetch la tabla de márgenes sigue presente (estado vacío o con
    // datos, ambos válidos: solo verificamos el encabezado).
    const marginsTable = cardByHeading(rangeSection, /margen por producto/i);
    await expect(marginsTable).toBeVisible();
    await expect(
      marginsTable.locator('th', { hasText: /producto/i }),
    ).toBeVisible();
  });
});