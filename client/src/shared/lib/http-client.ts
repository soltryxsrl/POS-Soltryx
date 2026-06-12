import type { ApiError } from '@/shared/types/enums';
import { env } from './env';

/**
 * Fetch wrapper con:
 *   - `credentials: 'include'` (envía cookie de refresh)
 *   - inyección automática de `Authorization: Bearer <accessToken>` desde un getter
 *   - auto-refresh transparente en 401 (un intento, vía callback)
 *   - errores tipados (`HttpClientError` con `ApiError`)
 *
 * El feature `auth` registra el getter y el refresher con `configureHttpAuth(...)`.
 * Antes de eso, el cliente funciona pero sin token (útil para /auth/login mismo).
 */
export class HttpClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly apiError: ApiError | null,
    message: string,
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

export interface HttpRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  searchParams?: Record<string, string | number | boolean | undefined>;
  /** Saltarse el auto-refresh para este request (p.ej. el propio /auth/refresh). */
  skipAuthRetry?: boolean;
  /** No anexar Bearer aunque haya token (p.ej. /auth/login). */
  skipAuth?: boolean;
}

interface AuthBridge {
  getAccessToken: () => string | null;
  refresh: () => Promise<string | null>; // devuelve el nuevo accessToken o null si falló
  onAuthLost: () => void; // limpia el store y redirige
  /** Sucursal activa seleccionada (solo si hay selección explícita). Null = usar HOME. */
  getBranchId: () => string | null;
}

let auth: AuthBridge | null = null;

export function configureHttpAuth(bridge: AuthBridge): void {
  auth = bridge;
}

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Single-flight: varios 401 simultáneos comparten UNA llamada a /auth/refresh.
 * El refresh token es single-use (el server lo rota en cada refresh): si cada
 * request disparara el suyo, el segundo llegaría con la cookie ya revocada y
 * cerraría la sesión del cajero en pleno turno.
 */
function refreshOnce(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = auth!.refresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function buildUrl(path: string, searchParams?: HttpRequestOptions['searchParams']): string {
  const base = env.apiUrl.replace(/\/$/, '');
  const url = new URL(`${base}/api${path.startsWith('/') ? path : `/${path}`}`);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function doFetch(path: string, opts: HttpRequestOptions, accessToken: string | null): Promise<Response> {
  const { body, searchParams, headers, skipAuth: _sa, skipAuthRetry: _sar, ...rest } = opts;
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(headers as Record<string, string> | undefined),
  };
  if (accessToken && !opts.skipAuth) {
    finalHeaders.Authorization = `Bearer ${accessToken}`;
  }
  // Sucursal activa: solo si hay selección explícita (admins). Sin header, el
  // servidor usa la sucursal HOME del usuario (cajeros).
  if (auth && !opts.skipAuth) {
    const branchId = auth.getBranchId();
    if (branchId) finalHeaders['X-Branch-Id'] = branchId;
  }
  return fetch(buildUrl(path, searchParams), {
    credentials: 'include',
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function parseError(res: Response, path: string): Promise<HttpClientError> {
  let apiError: ApiError | null = null;
  try {
    apiError = (await res.json()) as ApiError;
  } catch {
    // body no era JSON
  }
  return new HttpClientError(
    res.status,
    apiError,
    apiError?.message ?? `HTTP ${res.status} on ${path}`,
  );
}

export async function http<T>(path: string, opts: HttpRequestOptions = {}): Promise<T> {
  const accessToken = auth && !opts.skipAuth ? auth.getAccessToken() : null;
  let res = await doFetch(path, opts, accessToken);

  // Intento de auto-refresh si recibimos 401, hay bridge configurado, y no se pidió saltarlo.
  if (res.status === 401 && auth && !opts.skipAuth && !opts.skipAuthRetry) {
    const newToken = await refreshOnce();
    if (newToken) {
      res = await doFetch(path, { ...opts, skipAuthRetry: true }, newToken);
    } else {
      auth.onAuthLost();
    }
  }

  if (!res.ok) throw await parseError(res, path);
  if (res.status === 204) return null as T;
  // Algunos endpoints devuelven 200 con body vacío (p.ej. /cash-sessions/active sin
  // sesión). Retornamos `null` (no `undefined`) para que TanStack Query no falle
  // con "data is undefined" y para no romper con "Unexpected end of JSON input".
  const text = await res.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

/**
 * Sube un archivo vía multipart/form-data. NO fija Content-Type (el navegador
 * pone el boundary automáticamente). Reusa el bridge de auth (Bearer + sucursal
 * activa) y hace un intento de auto-refresh en 401, igual que `http`.
 */
export async function uploadFile<T>(
  path: string,
  file: File,
  fields?: Record<string, string>,
): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  if (fields) {
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
  }
  const send = (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (auth) {
      const branchId = auth.getBranchId();
      if (branchId) headers['X-Branch-Id'] = branchId;
    }
    return fetch(buildUrl(path), {
      method: 'POST',
      credentials: 'include',
      headers,
      body: form,
    });
  };

  let res = await send(auth ? auth.getAccessToken() : null);
  if (res.status === 401 && auth) {
    const newToken = await refreshOnce();
    if (newToken) res = await send(newToken);
    else auth.onAuthLost();
  }
  if (!res.ok) throw await parseError(res, path);
  const text = await res.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

/**
 * Sube una imagen al CDN y devuelve su URL pública. `folder` agrupa por recurso.
 */
export async function uploadImage(
  file: File,
  folder: 'products' | 'business',
): Promise<string> {
  const { url } = await uploadFile<{ url: string }>('/uploads/image', file, {
    folder,
  });
  return url;
}
