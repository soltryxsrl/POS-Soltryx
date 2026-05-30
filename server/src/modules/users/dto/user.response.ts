import type { UserOrmEntity } from '../../auth/infrastructure/persistence/typeorm/user.orm-entity';

export interface UserRoleSummary {
  id: string;
  code: string;
  name: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  fullName: string;
  isActive: boolean;
  branchId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: UserRoleSummary[];
}

export function toUserResponse(u: UserOrmEntity): UserResponse {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    fullName: u.fullName,
    isActive: u.isActive,
    branchId: u.branchId,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    roles: (u.roles ?? []).map((r) => ({ id: r.id, code: r.code, name: r.name })),
  };
}

export interface UsersListResponse {
  items: UserResponse[];
  total: number;
  limit: number;
  offset: number;
}
