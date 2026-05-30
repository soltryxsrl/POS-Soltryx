import { expect, test } from './fixtures';
import {
  api,
  purgeProductsBySkuPrefix,
} from './helpers/api';

/**
 * Verifica el flow completo cuando el cajero NO tiene `sales.discount.override`:
 *   1. Aplica descuento > umbral
 *   2. Click "Cobrar" + Confirmar venta
 *   3. Server responde 403 DISCOUNT_OVERRIDE_REQUIRED
 *   4. Aparece <ManagerOverrideDialog/>
 *   5. Cajero ingresa credenciales del admin
 *   6. Server valida, registra autorizador, venta se completa
 *
 * Para esto necesitamos un usuario CASHIER real (no admin). Lo creamos
 * inline en beforeAll y limpiamos en afterAll.
 */

const SKU_PREFIX = 'E2E-OVR-';
const CASHIER_USERNAME = 'e2e-cashier-override';
const CASHIER_EMAIL = 'e2e-cashier-override@t1et.local';
const CASHIER_PASSWORD = 'Cashier123!';

const API_BASE = 'http://localhost:3001/api';

/** Login via API y devuelve el cookie de refresh y el accessToken. */
async function apiLogin(
  emailOrUsername: string,
  password: string,
): Promise<{ accessToken: string; refreshCookieValue: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername, password }),
  });
  if (!res.ok) {
    throw new Error(`login ${emailOrUsername}: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { accessToken: string };
  const setCookies =
    (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  const rt = setCookies.find((c) => c.startsWith('t1et_rt='));
  if (!rt) throw new Error('no t1et_rt cookie in login');
  const value = rt.split(';')[0]!.split('=')[1]!;
  return { accessToken: data.accessToken, refreshCookieValue: value };
}

/** Llama a la API con un access token específico (no el cached del admin). */
async function apiAs<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(
      `${init?.method ?? 'GET'} ${path} as token → ${res.status}: ${await res.text()}`,
    );
  }
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

test.describe.serial('POS — override dialog (cashier sin permiso)', () => {
  let productId = '';
  let cashierId = '';
  let cashierAccessToken = '';
  let cashierRefreshCookie = '';

  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);

    // 1) Asegurar que existe el cashier; si ya existe de una corrida previa lo
    //    reutilizamos para mantener el test idempotente.
    const roles = await api<Array<{ id: string; code: string }>>('/roles');
    const cashierRole = roles.find((r) => r.code === 'CASHIER');
    if (!cashierRole) throw new Error('rol CASHIER no encontrado en el seed');

    let existing: { items: Array<{ id: string; email: string }> };
    try {
      existing = await api('/users?limit=200');
    } catch {
      existing = { items: [] };
    }
    const found = existing.items?.find((u) => u.email === CASHIER_EMAIL);
    if (found) {
      cashierId = found.id;
      // Reset la password por si la cambió otra corrida.
      // No hay endpoint admin para resetear — confiamos en que sigue siendo
      // CASHIER_PASSWORD desde la creación inicial. Si falla, borrarlo manualmente.
    } else {
      const created = await api<{ id: string }>('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: CASHIER_EMAIL,
          username: CASHIER_USERNAME,
          fullName: 'E2E Cashier Override',
          password: CASHIER_PASSWORD,
          roleIds: [cashierRole.id],
        }),
      });
      cashierId = created.id;
    }

    // 2) Login como cashier para tener su propio token + cookie.
    const session = await apiLogin(CASHIER_EMAIL, CASHIER_PASSWORD);
    cashierAccessToken = session.accessToken;
    cashierRefreshCookie = session.refreshCookieValue;

    // 3) Cash session: solo UNA puede estar abierta por registro a la vez.
    //    Si hay una activa abierta por otro usuario (típicamente admin de un
    //    test previo), la cerramos como admin antes de abrir una nueva como
    //    cashier. Esto deja al register libre.
    const registers = await api<Array<{ id: string }>>('/cash-registers');
    if (registers.length === 0) throw new Error('no cash registers');
    const registerId = registers[0]!.id;

    let myCashier = await apiAs<{ id: string } | null>(
      cashierAccessToken,
      '/cash-sessions/active?mine=true',
    );
    if (!myCashier || !myCashier.id) {
      // Cerrar lo que sea que esté ocupando el register (como admin).
      const activeOnRegister = await api<{ id: string } | null>(
        `/cash-sessions/active?cashRegisterId=${registerId}`,
      );
      if (activeOnRegister && activeOnRegister.id) {
        // El countedAmount real no importa para el test — pasamos el opening
        // por simplicidad (genera difference, pero el close no lo rechaza).
        try {
          await api(`/cash-sessions/${activeOnRegister.id}/close`, {
            method: 'POST',
            body: JSON.stringify({ countedAmount: '1000.00' }),
          });
        } catch {
          // Si ya cerró por otra vía, ignore.
        }
      }
      myCashier = await apiAs<{ id: string }>(cashierAccessToken, '/cash-sessions/open', {
        method: 'POST',
        body: JSON.stringify({
          cashRegisterId: registerId,
          openingAmount: '500.00',
        }),
      });
    }

    // 4) Crear el producto a vender (como admin, el cashier no tiene permiso).
    const p = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Override Producto',
        sku: `${SKU_PREFIX}P1`,
        salePrice: '100.00',
        taxRate: '0.00',
        initialStock: '50',
      }),
    });
    productId = p.id;
  });

  test.afterAll(async () => {
    // Cerrar la sesión del cashier para no bloquear el register en la próxima
    // corrida de cualquier spec.
    try {
      const mine = await apiAs<{ id: string } | null>(
        cashierAccessToken,
        '/cash-sessions/active?mine=true',
      );
      if (mine && mine.id) {
        await apiAs(cashierAccessToken, `/cash-sessions/${mine.id}/close`, {
          method: 'POST',
          body: JSON.stringify({ countedAmount: '500.00' }),
        });
      }
    } catch {
      // ignore
    }
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    // No borramos el cashier user — su soft-delete sería bloqueado por FK de
    // ventas creadas; lo dejamos para reuso en próximas corridas.
  });

  test('descuento alto sin permiso → dialog de manager → admin autoriza → venta cobra', async ({
    page,
    context,
  }) => {
    // Sustituir las cookies del fixture (admin) por las del cashier.
    await context.clearCookies();
    await context.addCookies([
      {
        name: 't1et_rt',
        value: cashierRefreshCookie,
        domain: 'localhost',
        path: '/api/auth',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 60 * 60,
      },
    ]);

    await page.goto('/pos');
    await page.waitForLoadState('networkidle');

    // Confirmar que estamos como cashier (no admin) — el POSHeader y el
    // sidebar muestran su nombre. Aceptamos cualquiera de los dos.
    await expect(page.getByText('E2E Cashier Override').first()).toBeVisible();

    // Agregar producto
    const search = page.getByPlaceholder(/busca por nombre/i);
    await search.fill(`${SKU_PREFIX}P1`);
    await page.getByRole('button', { name: /E2E Override Producto/ }).first().click();

    // Descuento de orden = $30 (30% de $100) → supera umbral 15%
    await page.locator('#order-discount-input').fill('30');
    await expect(page.getByText(/supera el umbral/i)).toBeVisible();

    // Cobrar
    await page.getByRole('button', { name: /^Cobrar/ }).click();
    const cobroDlg = page.getByRole('dialog', { name: 'Cobrar venta' });
    await expect(cobroDlg).toBeVisible();

    // Pagar el total (70.00)
    await cobroDlg.locator('input[inputmode="decimal"]').first().fill('70');
    await cobroDlg.getByRole('button', { name: /confirmar venta/i }).click();

    // → Aparece el ManagerOverrideDialog. El cobrar drawer sigue debajo, así
    //    que filtramos por el aria-label exacto del modal anidado.
    const overrideDlg = page.getByRole('dialog', {
      name: 'Autorización de descuento',
    });
    await expect(overrideDlg).toBeVisible({ timeout: 10_000 });
    await expect(
      overrideDlg.getByText(/se requiere autorización de un manager/i),
    ).toBeVisible();

    // El FormField no asocia label↔input vía htmlFor, así que seleccionamos
    // por autocomplete que tiene contrato fijo entre dialog y test.
    const userInput = overrideDlg.locator('input[autocomplete="username"]');
    const passInput = overrideDlg.locator('input[autocomplete="current-password"]');

    // Primero probamos con credenciales malas → debe quedarse en el dialog
    // mostrando error (no debe cerrar ni crear la venta).
    await userInput.fill('admin@t1et.local');
    await passInput.fill('WRONG_PASSWORD');
    await overrideDlg.getByRole('button', { name: /^autorizar$/i }).click();
    // Mensaje de error inline y dialog sigue abierto.
    await expect(overrideDlg.getByText(/contraseña incorrecta/i)).toBeVisible({
      timeout: 5_000,
    });

    // Ahora con credenciales válidas del admin (que tiene el permiso).
    await passInput.fill('Admin123!');
    await overrideDlg.getByRole('button', { name: /^autorizar$/i }).click();

    // → Venta procesada
    await expect(
      page.getByRole('heading', { name: /venta procesada correctamente/i }),
    ).toBeVisible({ timeout: 15_000 });

    // Verificación via API: la venta tiene snapshot del admin.
    await page.getByRole('button', { name: /ver detalle/i }).click();
    await page.waitForURL(/\/sales\/[^/]+$/);
    const saleId = page.url().split('/').pop()!;
    const sale = await apiAs<{
      orderDiscount: string;
      userId: string;
      discountAuthorizedById: string | null;
      discountAuthorizedBySnapshot: string | null;
    }>(cashierAccessToken, `/sales/${saleId}`);
    expect(sale.orderDiscount).toBe('30.00');
    expect(sale.userId).toBe(cashierId); // la venta es del cashier
    expect(sale.discountAuthorizedById).not.toBe(cashierId); // autorizó otro
    expect(sale.discountAuthorizedBySnapshot).toBe('Administrador');
  });
});
