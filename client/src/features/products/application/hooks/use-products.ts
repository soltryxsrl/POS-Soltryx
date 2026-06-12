'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveBranchStore } from '@/features/branches/application/stores/active-branch.store';
import { fetchAllPaged } from '@/shared/lib/fetch-all-paged';
import { productsApiHttp } from '../../infrastructure/api/products.api.http';
import type {
  BulkPriceUpdateInput,
  BulkStockLevelsInput,
  CreateProductInput,
  CreateVariantInput,
  ListProductsParams,
  SetKitComponentsInput,
  UpdateProductInput,
  UpdateVariantInput,
} from '../../domain/types';

export const productsKey = {
  all: ['products'] as const,
  // La lista se acota a la sucursal activa en el server (header X-Branch-Id);
  // incluir la sucursal en la key separa la caché por sucursal y fuerza refetch
  // determinista al cambiar de sucursal.
  list: (branchId: string | null, params: ListProductsParams) =>
    ['products', 'list', branchId, params] as const,
  byId: (id: string) => ['products', 'byId', id] as const,
  kitComponents: (id: string) => ['products', 'kitComponents', id] as const,
  variants: (id: string) => ['products', 'variants', id] as const,
};

export function useProducts(
  params: ListProductsParams = {},
  opts: { fetchAll?: boolean; cap?: number; keepPrevious?: boolean } = {},
) {
  const branchId = useActiveBranchStore((s) => s.activeBranchId);
  const fetchAll = opts.fetchAll ?? false;
  const cap = opts.cap ?? 2000;
  return useQuery({
    // El sufijo separa la caché de la vista paginada vs. la de "traer todo".
    queryKey: [...productsKey.list(branchId, params), fetchAll ? `all:${cap}` : 'page'],
    queryFn: () =>
      fetchAll
        ? fetchAllPaged((p) => productsApiHttp.list(p), params, { cap })
        : productsApiHttp.list(params),
    // En búsquedas tecleadas (POS) mantiene los resultados anteriores mientras
    // llega la página nueva: evita el flash de "vacío" en cada tecla.
    placeholderData: opts.keepPrevious ? keepPreviousData : undefined,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: productsKey.byId(id ?? '__none__'),
    queryFn: () => productsApiHttp.findById(id!),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => productsApiHttp.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKey.all }),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProductInput) => productsApiHttp.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productsKey.all });
      qc.invalidateQueries({ queryKey: productsKey.byId(id) });
    },
  });
}

export function useRemoveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApiHttp.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKey.all }),
  });
}

export function useBulkUpdatePrices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkPriceUpdateInput) => productsApiHttp.bulkUpdatePrices(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKey.all }),
  });
}

export function useBulkUpdateStockLevels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkStockLevelsInput) => productsApiHttp.bulkUpdateStockLevels(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKey.all }),
  });
}

export function useKitComponents(productId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: productsKey.kitComponents(productId ?? '__none__'),
    queryFn: () => productsApiHttp.listKitComponents(productId!),
    enabled: enabled && !!productId,
  });
}

export function useSetKitComponents(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SetKitComponentsInput) =>
      productsApiHttp.setKitComponents(productId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productsKey.kitComponents(productId) });
      qc.invalidateQueries({ queryKey: productsKey.byId(productId) });
    },
  });
}

export function useVariants(productId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: productsKey.variants(productId ?? '__none__'),
    queryFn: () => productsApiHttp.listVariants(productId!),
    enabled: enabled && !!productId,
  });
}

export function useCreateVariant(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVariantInput) =>
      productsApiHttp.createVariant(productId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productsKey.variants(productId) });
      qc.invalidateQueries({ queryKey: productsKey.byId(productId) });
      qc.invalidateQueries({ queryKey: productsKey.all });
    },
  });
}

export function useUpdateVariant(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { variantId: string; input: UpdateVariantInput }) =>
      productsApiHttp.updateVariant(productId, vars.variantId, vars.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productsKey.variants(productId) });
    },
  });
}

export function useDeleteVariant(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (variantId: string) =>
      productsApiHttp.deleteVariant(productId, variantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productsKey.variants(productId) });
      qc.invalidateQueries({ queryKey: productsKey.byId(productId) });
      qc.invalidateQueries({ queryKey: productsKey.all });
    },
  });
}
