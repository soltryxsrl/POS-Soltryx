'use client';

import type { ReactNode } from 'react';
import { useHasPermission } from '../../application/hooks/use-auth';

interface CanProps {
  /** Permiso(s) requerido(s). El usuario debe tener al menos uno (ANY). */
  permission: string | string[];
  /** Qué renderizar si tiene el permiso. */
  children: ReactNode;
  /** Qué renderizar si NO lo tiene (default: nada). */
  fallback?: ReactNode;
}

/**
 * Gate declarativo de UI por permiso.
 *
 * @example
 *   <Can permission="users.create">
 *     <button>Crear usuario</button>
 *   </Can>
 *
 *   <Can permission={["users.update", "users.delete"]} fallback={<ReadOnlyBadge />}>
 *     <EditActions />
 *   </Can>
 */
export function Can({ permission, children, fallback = null }: CanProps): ReactNode {
  const required = Array.isArray(permission) ? permission : [permission];
  const allowed = useHasPermission(...required);
  return allowed ? children : fallback;
}
