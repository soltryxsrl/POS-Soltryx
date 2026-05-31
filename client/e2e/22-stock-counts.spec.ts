import { expect, test } from './fixtures';
import { api, purgeProductsBySkuPrefix } from './helpers/api';

const SKU_PREFIX = 'E2E-SC-';

test.describe.serial('Conteo de inventario — simple product with variance', () => {
  let product1Id = '';
  let product2Id = '';

  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);

    // Producto simple 1: stock inicial 20
    const p1 = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E SC Producto A',
        sku: `${SKU_PREFIX}PA`,
        salePrice: '100.00',
        taxRate: '18.00',
        initialStock: '20',
      }),
    });
    product1Id = p1.id;

    // Producto simple 2: stock inicial 15
    const p2 = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E SC Producto B',
        sku: `${SKU_PREFIX}PB`,
        salePrice: '150.00',
        taxRate: '18.00',
        initialStock: '15',
      }),
    });
    product2Id = p2.id;
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('crear conteo fisico, registrar cantidades distintas al stock, completar y ver varianza', async ({
    page,
  }) => {
    await page.goto('/conteos');
    await page.waitForLoadState('networkidle');

    // El formulario de conteo se renderiza dentro de un <form> (sólo visible con
    // permiso inventory.adjust). Lo scopeamos para distinguir la tabla de
    // líneas staged de la tabla del listado de conteos que vive abajo.
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // 1) Buscar y agregar primer producto con cantidad distinta (contamos 18,
    //    el sistema tiene 20). Los resultados son <button> que aparecen al
    //    escribir; usamos auto-waiting con el role/name.
    const search = page.getByPlaceholder(/buscar producto por nombre o sku/i);
    await expect(search).toBeVisible();

    await search.fill(`${SKU_PREFIX}PA`);
    const resultA = page.getByRole('button', { name: /E2E SC Producto A/ });
    await expect(resultA).toBeVisible();
    await resultA.click();

    // La tabla de líneas staged vive dentro del form (sólo aparece con
    // lines.length > 0). Es la única tabla dentro del <form>.
    const stagedTable = form.locator('table');
    await expect(stagedTable).toBeVisible();
    await expect(stagedTable.getByText('E2E SC Producto A')).toBeVisible();

    // 2) Cambiar cantidad contada del primer producto a 18 (merma de 2).
    //    El input de cantidad contada es <input inputmode="decimal">.
    const countedInputs = stagedTable.locator('input[inputmode="decimal"]');
    await expect(countedInputs).toHaveCount(1);
    await countedInputs.first().fill('18');

    // 3) Buscar y agregar segundo producto (contamos 16, el sistema tiene 15).
    await search.fill('');
    await search.fill(`${SKU_PREFIX}PB`);
    const resultB = page.getByRole('button', { name: /E2E SC Producto B/ });
    await expect(resultB).toBeVisible();
    await resultB.click();
    await expect(stagedTable.getByText('E2E SC Producto B')).toBeVisible();

    // 4) Cambiar cantidad contada del segundo producto a 16 (sobrante de 1).
    await expect(countedInputs).toHaveCount(2);
    await countedInputs.nth(1).fill('16');

    // 5) Agregar notas opcionales (input por placeholder "Notas (opcional)").
    const notesInput = page.getByPlaceholder(/notas \(opcional\)/i);
    await notesInput.fill('Conteo del almacén central - revisión inicial');

    // 6) Completar el conteo. El botón muestra "Procesando…" mientras isPending
    //    y vuelve a "Completar conteo" al terminar.
    const completeBtn = page.getByRole('button', { name: /completar conteo/i });
    await expect(completeBtn).toBeEnabled();
    await completeBtn.click();

    // 7) Verificar el mensaje de éxito con la varianza. El render usa una clase
    //    Tailwind con barra (bg-emerald-950/30) que no es seleccionable por
    //    `div.bg-emerald-950`; usamos el texto, que es determinista y agnóstico
    //    al tema. El texto es "Conteo CNT-XXXXXX completado · N producto(s) con
    //    varianza · merma/sobrante neto: RD$..."
    const successMessage = page
      .getByText(/Conteo\s+CNT-\d+\s+completado/i)
      .locator('xpath=ancestor::div[1]');
    await expect(successMessage).toBeVisible({ timeout: 10_000 });
    await expect(successMessage).toContainText(/completado/i);
    await expect(successMessage).toContainText(/2 producto\(s\) con varianza/i);
    await expect(successMessage).toContainText(/merma\/sobrante neto:/i);

    // Capturamos el número de conteo del mensaje para aserciones deterministas
    // (no dependemos de "items[0]" ni del orden de la lista).
    const successText = (await successMessage.textContent()) ?? '';
    const countNumber = successText.match(/CNT-\d+/)?.[0];
    expect(countNumber, 'el mensaje de éxito debe incluir el número de conteo').toBeTruthy();

    // 8) Tras completar, las líneas staged se limpian (setLines([])), por lo que
    //    la tabla staged desaparece y sólo queda la tabla del listado de conteos.
    await expect(stagedTable).toBeHidden();

    // 9) El listado de conteos (única tabla restante) debe mostrar el nuevo
    //    conteo con estado "Completado". El listado se invalida tras la mutación.
    const countsTable = page.locator('table');
    await expect(countsTable).toBeVisible();
    const newRow = countsTable.locator('tr').filter({ hasText: countNumber! });
    await expect(newRow).toBeVisible();
    await expect(newRow).toContainText(/completado/i);
    // 2 productos con varianza en la columna correspondiente.
    await expect(newRow).toContainText('2');

    // 10) Verificación via API: el conteo debe existir como COMPLETED con la
    //     varianza calculada. Lo buscamos por countNumber (robusto al orden).
    await expect
      .poll(
        async () => {
          const data = await api<{
            items: Array<{
              countNumber: string;
              status: string;
              itemsWithVariance: number;
            }>;
          }>('/stock-counts?limit=20');
          const found = data.items.find((c) => c.countNumber === countNumber);
          return found
            ? { status: found.status, itemsWithVariance: found.itemsWithVariance }
            : null;
        },
        { timeout: 10_000 },
      )
      .toEqual({ status: 'COMPLETED', itemsWithVariance: 2 });

    // 11) Verificar stock actualizado en cada producto (ajustado a lo contado).
    const p1Updated = await api<{ stock: string }>(`/products/${product1Id}`);
    expect(p1Updated.stock).toBe('18.000'); // 20 → 18 (merma de 2)

    const p2Updated = await api<{ stock: string }>(`/products/${product2Id}`);
    expect(p2Updated.stock).toBe('16.000'); // 15 → 16 (sobrante de 1)
  });
});
