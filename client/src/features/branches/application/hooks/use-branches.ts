'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { branchesApiHttp } from '../../infrastructure/api/branches.api.http';
import type {
  CreateBranchInput,
  ListBranchesParams,
  UpdateBranchInput,
} from '../../domain/types';

export const branchesKey = {
  all: ['branches'] as const,
  list: (params: ListBranchesParams) => ['branches', 'list', params] as const,
  byId: (id: string) => ['branches', 'byId', id] as const,
};

export function useBranches(params: ListBranchesParams = {}) {
  return useQuery({
    queryKey: branchesKey.list(params),
    queryFn: () => branchesApiHttp.list(params),
  });
}

export function useBranch(id: string | null) {
  return useQuery({
    queryKey: branchesKey.byId(id ?? ''),
    queryFn: () => branchesApiHttp.findById(id as string),
    enabled: !!id,
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBranchInput) => branchesApiHttp.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: branchesKey.all }),
  });
}

export function useUpdateBranch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBranchInput) => branchesApiHttp.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: branchesKey.all }),
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => branchesApiHttp.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: branchesKey.all }),
  });
}

/**
 * Copia el catálogo de otra sucursal a la sucursal activa. Al terminar invalida
 * TODA la caché (productos/categorías de la sucursal activa cambiaron).
 */
export function useCloneCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceBranchId: string) => branchesApiHttp.cloneCatalog(sourceBranchId),
    onSuccess: () => qc.invalidateQueries(),
  });
}
