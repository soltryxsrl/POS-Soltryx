import { http, HttpClientError } from '@/shared/lib/http-client';
import type { AuthApi } from '../../domain/ports';
import type { AuthSession, AuthUser, LoginInput } from '../../domain/types';

interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  accessTokenExpiresInSec: number;
}

export const authApiHttp: AuthApi = {
  async login(input: LoginInput): Promise<AuthSession> {
    const r = await http<LoginResponse>('/auth/login', {
      method: 'POST',
      body: input,
      skipAuth: true,
    });
    return r;
  },

  async refresh(): Promise<AuthSession | null> {
    try {
      const r = await http<LoginResponse>('/auth/refresh', {
        method: 'POST',
        skipAuth: true,
        skipAuthRetry: true,
      });
      return r;
    } catch (e) {
      if (e instanceof HttpClientError && (e.status === 401 || e.status === 403)) return null;
      throw e;
    }
  },

  async logout(): Promise<void> {
    try {
      await http<void>('/auth/logout', { method: 'POST', skipAuth: true, skipAuthRetry: true });
    } catch {
      // logout es idempotente — ignorar errores de red/cookie
    }
  },

  me(): Promise<{ user: AuthUser }> {
    return http<{ user: AuthUser }>('/auth/me');
  },
};
