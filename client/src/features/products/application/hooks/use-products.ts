'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApiHttp } from '../../infrastructure/api/products.api.http';
import type {
  CreateProductInput,
  CreateVariantInput,
  ListProductsParams,
  SetKitComponentsInput,
  UpdateProductInput,
  UpdateVariantInput,
} from '../../domain/types';

export const productsKey = {
  all: ['products'] as const,
  list: (params: ListProductsParams) => ['products', 'list', params] as const,
  byId: (id: string) => ['products', 'byId', id] as const,
  kitComponents: (id: string) => ['products', 'kitComponents', id] as const,
  variants: (id: string) => ['products', 'variants', id] as const,
};

export function useProducts(params: ListProductsParams = {}) {
  return useQuery({
    queryKey: productsKey.list(params),
    queryFn: () => productsApiHttp.list(params),
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
