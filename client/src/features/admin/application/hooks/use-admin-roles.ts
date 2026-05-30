'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../infrastructure/api/admin.api.http';
import type {
  CreateAdminRoleInput,
  UpdateAdminRoleInput,
} from '../../domain/types';

export const adminRolesKey = {
  all: ['admin', 'roles'] as const,
  list: ['admin', 'roles', 'list'] as const,
  byId: (id: string) => ['admin', 'roles', 'byId', id] as const,
  permissions: ['admin', 'permissions'] as const,
};

export function useAdminRoles() {
  return useQuery({
    queryKey: adminRolesKey.list,
    queryFn: () => adminApi.listRoles(),
  });
}

export function useAdminRole(id: string | undefined) {
  return useQuery({
    queryKey: adminRolesKey.byId(id ?? '__none__'),
    queryFn: () => adminApi.getRole(id!),
    enabled: !!id,
  });
}

export function useAdminPermissions() {
  return useQuery({
    queryKey: adminRolesKey.permissions,
    queryFn: () => adminApi.listPermissions(),
    // Catálogo cambia muy poco — cachear más tiempo
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdminRoleInput) => adminApi.createRole(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminRolesKey.all }),
  });
}

export function useUpdateAdminRole(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAdminRoleInput) => adminApi.updateRole(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminRolesKey.all });
      qc.invalidateQueries({ queryKey: adminRolesKey.byId(id) });
    },
  });
}

export function useRemoveAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.removeRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminRolesKey.all }),
  });
}
