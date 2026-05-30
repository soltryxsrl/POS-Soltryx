import { http } from '@/shared/lib/http-client';
import type {
  AdminPermission,
  AdminRole,
  AdminUser,
  AdminUsersListResponse,
  CreateAdminRoleInput,
  CreateAdminUserInput,
  ListAdminUsersParams,
  UpdateAdminRoleInput,
  UpdateAdminUserInput,
} from '../../domain/types';

export const adminApi = {
  // --- users ---
  listUsers: (params?: ListAdminUsersParams) =>
    http<AdminUsersListResponse>('/users', {
      searchParams: params as Record<string, string | number | boolean | undefined> | undefined,
    }),
  getUser: (id: string) => http<AdminUser>(`/users/${id}`),
  createUser: (input: CreateAdminUserInput) =>
    http<AdminUser>('/users', { method: 'POST', body: input }),
  updateUser: (id: string, input: UpdateAdminUserInput) =>
    http<AdminUser>(`/users/${id}`, { method: 'PATCH', body: input }),
  removeUser: (id: string) => http<void>(`/users/${id}`, { method: 'DELETE' }),

  // --- roles ---
  listRoles: () => http<AdminRole[]>('/roles'),
  getRole: (id: string) => http<AdminRole>(`/roles/${id}`),
  createRole: (input: CreateAdminRoleInput) =>
    http<AdminRole>('/roles', { method: 'POST', body: input }),
  updateRole: (id: string, input: UpdateAdminRoleInput) =>
    http<AdminRole>(`/roles/${id}`, { method: 'PATCH', body: input }),
  removeRole: (id: string) => http<void>(`/roles/${id}`, { method: 'DELETE' }),

  // --- permissions catalog ---
  listPermissions: () => http<AdminPermission[]>('/permissions'),
};
