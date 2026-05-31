import { configureHttpAuth } from '@/shared/lib/http-client';
import { getActiveBranchIdFromStore } from '@/features/branches/application/stores/active-branch.store';
import { authApiHttp } from '../infrastructure/api/auth.api.http';
import { getAccessTokenFromStore, useAuthStore } from './stores/auth.store';

/**
 * Conecta el http-client global con el store + el adapter de auth.
 * Llamar UNA VEZ en arranque (desde `Providers` u otro punto top-level).
 *
 * Resuelve la dependencia circular natural de:
 *   http-client → necesita token + refresh → necesita authApi → usa http-client
 * exponiendo un "bridge" inyectable.
 */
let configured = false;

export function setupHttpAuth(): void {
  if (configured) return;
  configured = true;
  configureHttpAuth({
    getAccessToken: () => getAccessTokenFromStore(),
    refresh: async () => {
      const session = await authApiHttp.refresh();
      if (!session) return null;
      useAuthStore.getState().setSession(session);
      return session.accessToken;
    },
    onAuthLost: () => {
      useAuthStore.getState().clear();
    },
    getBranchId: () => getActiveBranchIdFromStore(),
  });
}
