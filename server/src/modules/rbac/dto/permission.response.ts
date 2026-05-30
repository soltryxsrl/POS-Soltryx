import type { PermissionOrmEntity } from '../../auth/infrastructure/persistence/typeorm/permission.orm-entity';

export interface PermissionResponse {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string | null;
}

export function toPermissionResponse(p: PermissionOrmEntity): PermissionResponse {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    module: p.module,
    description: p.description,
  };
}
