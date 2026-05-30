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

/**
 * Devuelve true si el usuario autenticado tiene **al menos uno** de los
 * permisos pasados. Si no se pasan permisos, devuelve true.
 *
 * Coincide con la semántica del backend `@RequirePermissions(...)` (ANY).
 *
 * @example
 *   const canCreateUsers = useHasPermission('users.create');
 *   const canManage = useHasPermission('users.create', 'users.update');
 */
export function useHasPermission(...required: string[]): boolean {
  return useAuthStore((s) => {
    if (required.length === 0) return true;
    const perms = s.user?.permissions;
    if (!perms || perms.length === 0) return false;
    return required.some((p) => perms.includes(p));
  });
}
