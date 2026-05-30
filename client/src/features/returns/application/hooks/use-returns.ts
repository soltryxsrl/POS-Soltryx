'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsKey } from '@/features/products/application/hooks/use-products';
import { movementsKey } from '@/features/inventory/application/hooks/use-inventory';
import { salesKey } from '@/features/sales/application/hooks/use-sales';
import { returnsApiHttp } from '../../infrastructure/api/returns.api.http';
import type { CreateReturnInput, ListReturnsParams } from '../../domain/types';

export const returnsKey = {
  all: ['returns'] as const,
  list: (params: ListReturnsParams) => ['returns', 'list', params] as const,
  forSale: (saleId: string) => ['returns', 'sale', saleId] as const,
  returnable: (saleId: string) => ['returns', 'returnable', saleId] as const,
};

export function useReturns(params: ListReturnsParams = {}) {
  return useQuery({
    queryKey: returnsKey.list(params),
    queryFn: () => returnsApiHttp.list(params),
  });
}

export function useReturnsForSale(saleId: string | undefined) {
  return useQuery({
    queryKey: returnsKey.forSale(saleId ?? '__none__'),
    queryFn: () => returnsApiHttp.listForSale(saleId!),
    enabled: !!saleId,
  });
}

export function useReturnableItems(saleId: string | undefined) {
  return useQuery({
    queryKey: returnsKey.returnable(saleId ?? '__none__'),
    queryFn: () => returnsApiHttp.returnable(saleId!),
    enabled: !!saleId,
  });
}

export function useCreateReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReturnInput) => returnsApiHttp.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: returnsKey.all });
      qc.invalidateQueries({ queryKey: salesKey.all });
      qc.invalidateQueries({ queryKey: productsKey.all });
      qc.invalidateQueries({ queryKey: movementsKey.all });
    },
  });
}
