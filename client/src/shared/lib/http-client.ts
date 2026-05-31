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
    const newToken = await auth.refresh();
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
