'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllPaged } from '@/shared/lib/fetch-all-paged';
import { suppliersApiHttp } from '../../infrastructure/api/suppliers.api.http';
import type {
  CreateSupplierInput,
  ListSuppliersParams,
  UpdateSupplierInput,
} from '../../domain/types';

export const suppliersKey = {
  all: ['suppliers'] as const,
  list: (params: ListSuppliersParams) => ['suppliers', 'list', params] as const,
  byId: (id: string) => ['suppliers', 'byId', id] as const,
};

export function useSuppliers(
  params: ListSuppliersParams = {},
  opts: { fetchAll?: boolean; cap?: number } = {},
) {
  const fetchAll = opts.fetchAll ?? false;
  const cap = opts.cap ?? 2000;
  return useQuery({
    // El sufijo separa la caché de la vista paginada vs. la de "traer todo".
    queryKey: [...suppliersKey.list(params), fetchAll ? `all:${cap}` : 'page'],
    queryFn: () =>
      fetchAll
        ? fetchAllPaged((p) => suppliersApiHttp.list(p), params, { cap })
        : suppliersApiHttp.list(params),
  });
}

export function useSupplier(id: string | undefined) {
  return useQuery({
    queryKey: suppliersKey.byId(id ?? '__none__'),
    queryFn: () => suppliersApiHttp.findById(id!),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSupplierInput) => suppliersApiHttp.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: suppliersKey.all }),
  });
}

export function useUpdateSupplier(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSupplierInput) => suppliersApiHttp.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: suppliersKey.all });
      qc.invalidateQueries({ queryKey: suppliersKey.byId(id) });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suppliersApiHttp.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: suppliersKey.all }),
  });
}
