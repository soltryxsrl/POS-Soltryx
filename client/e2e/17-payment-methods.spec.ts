import { expect, test } from './fixtures';
import { api } from './helpers/api';

interface PaymentMethod {
  code: string;
  name: string;
  requiresReference: boolean;
  isActive: boolean;
  isDefault: boolean;
}

test.describe('Formas de pago (mantenimiento)', () => {
  test.afterAll(async () => {
    // Restaurar por si el test dejó algo a medias.
    await api('/payment-methods/OTHER', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Otro' }),
    });
    await api('/payment-methods/CARD', {
      method: 'PATCH',
      body: JSON.stringify({ requiresReference: true }),
    });
  });

  test('lista y edita (referencia + nombre) vía el diálogo de acción', async ({
    page,
  }) => {
    await page.goto('/admin/formas-pago');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: /formas de pago/i }),
    ).toBeVisible();

    // Efectivo es el default; la clase de comportamiento se muestra.
    const efectivo = page.getByRole('row').filter({ hasText: 'Efectivo' });
    await expect(efectivo.getByText('Default', { exact: true })).toBeVisible();
    await expect(
      page.getByText(/Crédito \(cuenta por cobrar\)/),
    ).toBeVisible();

    // Abrir el diálogo de Tarjeta y apagar "Pide referencia" (Sí -> No).
    await page
      .getByRole('row')
      .filter({ hasText: 'Tarjeta' })
      .getByRole('button', { name: /editar/i })
      .click();
    const dlg = page.getByRole('dialog');
    await expect(
      dlg.getByRole('heading', { name: /editar forma de pago/i }),
    ).toBeVisible();
    await dlg
      .locator('label')
      .filter({ hasText: /pide referencia/i })
      .locator('input[type="checkbox"]')
      .uncheck();
    await dlg.getByRole('button', { name: /^Actualizar$/ }).click();
    await expect(dlg).toBeHidden();
    await expect
      .poll(async () => {
        const list = await api<PaymentMethod[]>('/payment-methods');
        return list.find((m) => m.code === 'CARD')?.requiresReference;
      })
      .toBe(false);

    // Abrir el diálogo de "Otro" y renombrar a "Cheque".
    await page
      .getByRole('row')
      .filter({ hasText: 'Otro' })
      .getByRole('button', { name: /editar/i })
      .click();
    const dlg2 = page.getByRole('dialog');
    await expect(
      dlg2.getByRole('heading', { name: /editar forma de pago/i }),
    ).toBeVisible();
    await dlg2.getByRole('textbox').first().fill('Cheque');
    await dlg2.getByRole('button', { name: /^Actualizar$/ }).click();
    await expect(dlg2).toBeHidden();
    await expect
      .poll(async () => {
        const list = await api<PaymentMethod[]>('/payment-methods');
        return list.find((m) => m.code === 'OTHER')?.name;
      })
      .toBe('Cheque');
  });
});
