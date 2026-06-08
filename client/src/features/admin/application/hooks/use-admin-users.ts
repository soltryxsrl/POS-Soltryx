'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllPaged } from '@/shared/lib/fetch-all-paged';
import { adminApi } from '../../infrastructure/api/admin.api.http';
import type {
  CreateAdminUserInput,
  ListAdminUsersParams,
  UpdateAdminUserInput,
} from '../../domain/types';

export const adminUsersKey = {
  all: ['admin', 'users'] as const,
  list: (params: ListAdminUsersParams) => ['admin', 'users', 'list', params] as const,
  byId: (id: string) => ['admin', 'users', 'byId', id] as const,
};

export function useAdminUsers(
  params: ListAdminUsersParams = {},
  opts: { fetchAll?: boolean; cap?: number } = {},
) {
  const fetchAll = opts.fetchAll ?? false;
  const cap = opts.cap ?? 2000;
  return useQuery({
    // El sufijo separa la caché de la vista paginada vs. la de "traer todo".
    queryKey: [...adminUsersKey.list(params), fetchAll ? `all:${cap}` : 'page'],
    queryFn: () =>
      fetchAll
        ? fetchAllPaged((p) => adminApi.listUsers(p), params, { cap })
        : adminApi.listUsers(params),
  });
}

export function useAdminUser(id: string | undefined) {
  return useQuery({
    queryKey: adminUsersKey.byId(id ?? '__none__'),
    queryFn: () => adminApi.getUser(id!),
    enabled: !!id,
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdminUserInput) => adminApi.createUser(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminUsersKey.all }),
  });
}

export function useUpdateAdminUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAdminUserInput) => adminApi.updateUser(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminUsersKey.all });
      qc.invalidateQueries({ queryKey: adminUsersKey.byId(id) });
    },
  });
}

export function useRemoveAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.removeUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminUsersKey.all }),
  });
}
