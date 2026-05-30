'use client';

import { useAuthStore } from '../stores/auth.store';

/** Hook conveniente para componentes que solo necesitan leer el estado de auth. */
export function useAuth() {
  return useAuthStore((s) => ({
    user: s.user,
    status: s.status,
    isAuthenticated: s.status === 'authenticated',
    isLoading: s.status === 'idle' || s.status === 'loading',
  }));
}
