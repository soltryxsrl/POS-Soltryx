import { create } from 'zustand';
import type { AuthSession, AuthUser } from '../../domain/types';

/**
 * Estado de autenticación EN MEMORIA.
 * - No persistimos `accessToken` en localStorage (XSS-safe).
 * - El refresh token vive en cookie httpOnly del navegador (sin acceso JS).
 * - Al recargar la página llamamos `/auth/refresh` para reconstruir la sesión.
 */
interface AuthStateBase {
  user: AuthUser | null;
  accessToken: string | null;
  /** Estado del bootstrap inicial (hasta resolver refresh en arranque). */
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
}

interface AuthActions {
  setSession: (s: AuthSession) => void;
  setUser: (u: AuthUser | null) => void;
  setStatus: (s: AuthStateBase['status']) => void;
  clear: () => void;
}

export type AuthState = AuthStateBase & AuthActions;

const initial: AuthStateBase = {
  user: null,
  accessToken: null,
  status: 'idle',
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initial,
  setSession: (s) =>
    set({ user: s.user, accessToken: s.accessToken, status: 'authenticated' }),
  setUser: (u) => set({ user: u }),
  setStatus: (status) => set({ status }),
  clear: () => set({ ...initial, status: 'unauthenticated' }),
}));

/** Selector helper para uso desde el http-client (fuera de React). */
export function getAccessTokenFromStore(): string | null {
  return useAuthStore.getState().accessToken;
}
