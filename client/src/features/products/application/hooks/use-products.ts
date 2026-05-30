'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApiHttp } from '../../infrastructure/api/products.api.http';
import type {
  CreateProductInput,
  ListProductsParams,
  UpdateProductInput,
} from '../../domain/types';

export const productsKey = {
  all: ['products'] as const,
  list: (params: ListProductsParams) => ['products', 'list', params] as const,
  byId: (id: string) => ['products', 'byId', id] as const,
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
