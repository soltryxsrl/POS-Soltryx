import type { PermissionOrmEntity } from '../../auth/infrastructure/persistence/typeorm/permission.orm-entity';
import type { RoleOrmEntity } from '../../auth/infrastructure/persistence/typeorm/role.orm-entity';

export interface RolePermissionSummary {
  id: string;
  code: string;
  name: string;
  module: string;
}

export interface RoleResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  permissions: RolePermissionSummary[];
  /** Cantidad de usuarios activos asignados a este rol. */
  userCount?: number;
}

function toPermSummary(p: PermissionOrmEntity): RolePermissionSummary {
  return { id: p.id, code: p.code, name: p.name, module: p.module };
}

export function toRoleResponse(r: RoleOrmEntity, userCount?: number): RoleResponse {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    permissions: (r.permissions ?? []).map(toPermSummary),
    ...(userCount !== undefined ? { userCount } : {}),
  };
}
