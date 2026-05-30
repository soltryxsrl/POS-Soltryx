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

  test('lista, togglea "pide referencia" y renombra (persiste en el catálogo)', async ({
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

    // Toggle "pide referencia" de Tarjeta (Sí -> No), verificando API.
    const tarjeta = page.getByRole('row').filter({ hasText: 'Tarjeta' });
    await tarjeta.getByRole('button', { name: /^Sí$/ }).click();
    await expect
      .poll(async () => {
        const list = await api<PaymentMethod[]>('/payment-methods');
        return list.find((m) => m.code === 'CARD')?.requiresReference;
      })
      .toBe(false);

    // Renombrar "Otro" -> "Cheque" con el input inline (guarda al perder foco).
    const otro = page.getByRole('row').filter({ hasText: 'Otro' });
    const nameInput = otro.locator('input').first();
    await nameInput.fill('Cheque');
    await nameInput.blur();
    await expect
      .poll(async () => {
        const list = await api<PaymentMethod[]>('/payment-methods');
        return list.find((m) => m.code === 'OTHER')?.name;
      })
      .toBe('Cheque');
  });
});
