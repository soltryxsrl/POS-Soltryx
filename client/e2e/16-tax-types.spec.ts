import { expect, test } from './fixtures';
import { api } from './helpers/api';

interface TaxType {
  code: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
}

test.describe('Tipos de ITBIS (mantenimiento)', () => {
  test('lista las tasas, togglea activo y el form de producto usa el catálogo', async ({
    page,
  }) => {
    await page.goto('/impuestos/itbis');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: /tipos de itbis/i }),
    ).toBeVisible();

    // Tasas sembradas + badge Default en 18%
    const row18 = page.getByRole('row').filter({ hasText: 'ITBIS 18%' });
    await expect(row18).toBeVisible();
    await expect(row18.getByText('Default', { exact: true })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Exento' })).toBeVisible();

    // Toggle activo de ITBIS 16% (Activo -> Inactivo -> Activo), verificando API.
    const row16 = page.getByRole('row').filter({ hasText: 'ITBIS 16%' });
    await row16.getByRole('button', { name: /^Activo$/ }).click();
    await expect(row16.getByRole('button', { name: /^Inactivo$/ })).toBeVisible();
    await expect
      .poll(async () => {
        const list = await api<TaxType[]>('/tax-types');
        return list.find((t) => t.code === 'ITBIS16')?.isActive;
      })
      .toBe(false);

    await row16.getByRole('button', { name: /^Inactivo$/ }).click();
    await expect(row16.getByRole('button', { name: /^Activo$/ })).toBeVisible();
    await expect
      .poll(async () => {
        const list = await api<TaxType[]>('/tax-types');
        return list.find((t) => t.code === 'ITBIS16')?.isActive;
      })
      .toBe(true);

    // El alta de producto (drawer) usa el selector de Tipo de ITBIS del catálogo.
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /nuevo producto/i }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByText(/Tipo de ITBIS/i)).toBeVisible();
    await expect(
      dlg.locator('select').filter({ hasText: 'ITBIS 18%' }),
    ).toBeVisible();
  });
});
