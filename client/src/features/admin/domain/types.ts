export interface AdminUserRole {
  id: string;
  code: string;
  name: string;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  isActive: boolean;
  branchId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: AdminUserRole[];
}

export interface AdminUsersListResponse {
  items: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListAdminUsersParams {
  q?: string;
  isActive?: boolean;
  roleId?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
}

export interface CreateAdminUserInput {
  email: string;
  username: string;
  fullName: string;
  password: string;
  roleIds?: string[];
  isActive?: boolean;
}

export interface UpdateAdminUserInput {
  email?: string;
  username?: string;
  fullName?: string;
  password?: string;
  roleIds?: string[];
  isActive?: boolean;
}

export interface AdminPermission {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string | null;
}

export interface AdminRolePermission {
  id: string;
  code: string;
  name: string;
  module: string;
}

export interface AdminRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  permissions: AdminRolePermission[];
  userCount?: number;
}

export interface CreateAdminRoleInput {
  code: string;
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateAdminRoleInput {
  name?: string;
  description?: string;
  permissionIds?: string[];
}
