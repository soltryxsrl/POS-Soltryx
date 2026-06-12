/**
 * Cliente API mínimo para los tests E2E. Permite cleanup rápido entre tests
 * sin tener que navegar la UI cada vez.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://localhost:3001/api';
let cachedToken: string | null = null;

/**
 * Fecha de HOY en hora de RD (America/Santo_Domingo), formato YYYY-MM-DD.
 * Los reportes fiscales/diarios filtran por fecha LOCAL RD (no UTC), así que los
 * specs deben usar esta — no `new Date().toISOString()` (UTC), que cerca de la
 * medianoche UTC cae en otro día y no coincide con el rango del reporte.
 */
export function rdToday(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Santo_Domingo',
  });
}

export async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailOrUsername: 'admin@t1et.local',
      password: 'Admin123!',
    }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  const data = (await res.json()) as { accessToken: string };
  cachedToken = data.accessToken;
  return cachedToken;
}

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getToken();
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status}: ${body}`);
  }
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

/**
 * Borra productos del seed cuyo SKU empiece por el prefix dado.
 * Útil para limpiar antes/después de cada test sin tocar productos reales.
 */
export async function purgeProductsBySkuPrefix(prefix: string): Promise<void> {
  const list = await api<{ items: Array<{ id: string; sku: string; isKit: boolean }> }>(
    `/products?limit=200`,
  );
  for (const p of list.items) {
    if (!p.sku.startsWith(prefix)) continue;
    // Si es kit, primero vaciamos componentes (DELETE en cascade lo permitiría
    // pero el FK de components apunta a productos no-kit que NO queremos borrar).
    if (p.isKit) {
      try {
        await api(`/products/${p.id}/kit-components`, {
          method: 'POST',
          body: JSON.stringify({ components: [] }),
        });
      } catch {
        // ignore
      }
    }
    // Variantes: borrar primero
    try {
      const vars = await api<Array<{ id: string }>>(`/products/${p.id}/variants`);
      for (const v of vars) {
        await api(`/products/${p.id}/variants/${v.id}`, { method: 'DELETE' });
      }
    } catch {
      // producto sin endpoint de variantes o sin variantes — ignore
    }
    try {
      await api(`/products/${p.id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('[purge] failed', p.sku, err);
    }
  }
}

/**
 * Borra promociones por prefijo de nombre.
 */
export async function purgePromotionsByNamePrefix(prefix: string): Promise<void> {
  const res = await api<{ items: Array<{ id: string; name: string }> }>(
    '/promotions',
  );
  for (const promo of res.items ?? []) {
    if (!promo.name.startsWith(prefix)) continue;
    try {
      await api(`/promotions/${promo.id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
  }
}

export async function ensureUsdActiveAtRate(rate: string): Promise<void> {
  await api(`/currencies/USD/rate`, {
    method: 'PUT',
    body: JSON.stringify({ rate }),
  });
  await api(`/currencies/USD`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive: true }),
  });
}

export async function deactivateUsd(): Promise<void> {
  try {
    await api(`/currencies/USD`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: false }),
    });
  } catch {
    // ignore
  }
}

/**
 * Borra todos los carritos en espera del usuario actual en la sesión activa.
 */
export async function purgeMyParkedCarts(): Promise<void> {
  try {
    const sess = await api<{ id: string } | null>(
      '/cash-sessions/active?mine=true',
    );
    if (!sess || !sess.id) return;
    const list = await api<Array<{ id: string }>>(
      `/parked-carts?cashSessionId=${sess.id}`,
    );
    for (const c of list) {
      try {
        await api(`/parked-carts/${c.id}`, { method: 'DELETE' });
      } catch {
        // ignore
      }
    }
  } catch {
    // sin sesión o sin endpoint — nada que limpiar
  }
}

/**
 * Secreto super-admin para PATCH /plan. Lo toma de env (E2E_SUPERADMIN_SECRET o
 * SUPERADMIN_SECRET) o, en su defecto, lo lee de server/.env — el mismo que usa
 * la API local. Así los specs multi-sucursal son autocontenidos sin exportar
 * nada a mano. La gestión del plan se protege por este secreto (no por rol), ver
 * PlanController.
 */
let cachedSecret: string | null = null;
function getSuperadminSecret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.E2E_SUPERADMIN_SECRET ?? process.env.SUPERADMIN_SECRET;
  if (fromEnv) return (cachedSecret = fromEnv);
  // client/e2e/helpers → ../../../server/.env
  const envPath = join(__dirname, '..', '..', '..', 'server', '.env');
  let raw: string;
  try {
    raw = readFileSync(envPath, 'utf8');
  } catch {
    throw new Error(
      `No pude leer SUPERADMIN_SECRET (ni env ni ${envPath}). Necesario para habilitar multi-sucursal en e2e.`,
    );
  }
  const line = raw.split(/\r?\n/).find((l) => l.startsWith('SUPERADMIN_SECRET='));
  const value = line?.slice('SUPERADMIN_SECRET='.length).trim().replace(/^["']|["']$/g, '');
  if (!value) throw new Error('SUPERADMIN_SECRET vacío en server/.env');
  return (cachedSecret = value);
}

/**
 * Habilita multi-sucursal en el plan (PATCH /plan con el secreto super-admin) y
 * deja branches ilimitadas. Necesario para los specs que ejercitan features
 * multi-sucursal: desde el commit que la dejó OFF por defecto, la ruta queda
 * gateada y el switcher/toggle no se renderiza.
 */
export async function enableMultiBranch(): Promise<void> {
  const res = await authFetch('/plan', {
    method: 'PATCH',
    headers: { 'x-superadmin-secret': getSuperadminSecret() },
    body: JSON.stringify({ multiBranchEnabled: true, maxBranches: null }),
  });
  if (!res.ok) {
    throw new Error(`enableMultiBranch falló: ${res.status} ${await res.text()}`);
  }
}

/** Revierte multi-sucursal a OFF (el default de producción). */
export async function disableMultiBranch(): Promise<void> {
  try {
    await authFetch('/plan', {
      method: 'PATCH',
      headers: { 'x-superadmin-secret': getSuperadminSecret() },
      body: JSON.stringify({ multiBranchEnabled: false }),
    });
  } catch {
    // best-effort: si falla, el siguiente spec que necesite OFF lo reajusta
  }
}

/**
 * Garantiza una 2ª sucursal activa con el nombre dado (default "Sucursal 2"),
 * idempotente. Requiere multi-sucursal habilitado (assertCanCreateBranch). Útil
 * para transferencias y cambio de sucursal.
 */
export async function ensureSecondBranch(name = 'Sucursal 2'): Promise<void> {
  const branches = await api<{ items: Array<{ id: string; name: string }> }>(
    '/branches?isActive=true&limit=100',
  );
  if (branches.items.some((b) => b.name === name)) return;
  const res = await authFetch('/branches', {
    method: 'POST',
    body: JSON.stringify({ code: 'SUC2', name, isActive: true }),
  });
  // 409 = el código ya existe (creada por una corrida previa) — aceptable.
  if (!res.ok && res.status !== 409) {
    throw new Error(`ensureSecondBranch falló: ${res.status} ${await res.text()}`);
  }
}

/**
 * Garantiza que haya una sesión de caja abierta. Devuelve el id de la sesión.
 */
export async function ensureCashSessionOpen(): Promise<string> {
  try {
    const existing = await api<{ id: string } | null>(
      '/cash-sessions/active?mine=true',
    );
    if (existing && existing.id) return existing.id;
  } catch {
    // fall through
  }
  const registers = await api<Array<{ id: string }>>('/cash-registers');
  if (registers.length === 0) {
    throw new Error('No hay cash registers configurados — el seed crea CR-001');
  }
  // Alguien más podría tener la sesión abierta en este register
  try {
    const onRegister = await api<{ id: string } | null>(
      `/cash-sessions/active?cashRegisterId=${registers[0].id}`,
    );
    if (onRegister && onRegister.id) return onRegister.id;
  } catch {
    // fall through
  }
  const sess = await api<{ id: string }>('/cash-sessions/open', {
    method: 'POST',
    body: JSON.stringify({
      cashRegisterId: registers[0].id,
      openingAmount: '1000.00',
    }),
  });
  return sess.id;
}
