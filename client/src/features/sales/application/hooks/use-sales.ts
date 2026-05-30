'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApiHttp } from '../../infrastructure/api/sales.api.http';
import type { CreateSaleInput, ListSalesParams } from '../../domain/types';
import { productsKey } from '@/features/products/application/hooks/use-products';
import { cashKey } from '@/features/cash/application/hooks/use-cash';
import { movementsKey } from '@/features/inventory/application/hooks/use-inventory';

export const salesKey = {
  all: ['sales'] as const,
  list: (params: ListSalesParams) => ['sales', 'list', params] as const,
  byId: (id: string) => ['sales', 'byId', id] as const,
};

export function useSales(params: ListSalesParams = {}) {
  return useQuery({
    queryKey: salesKey.list(params),
    queryFn: () => salesApiHttp.list(params),
  });
}

export function useSale(id: string | undefined) {
  return useQuery({
    queryKey: salesKey.byId(id ?? '__none__'),
    queryFn: () => salesApiHttp.findById(id!),
    enabled: !!id,
  });
}

/**
 * Tras crear/cancelar una venta invalidamos productos (stock cambió),
 * stock movements (history) y cash sessions (summary cambia).
 */
function invalidateRelated(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: salesKey.all });
  qc.invalidateQueries({ queryKey: productsKey.all });
  qc.invalidateQueries({ queryKey: movementsKey.all });
  qc.invalidateQueries({ queryKey: cashKey.all });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSaleInput) => salesApiHttp.create(input),
    onSuccess: () => invalidateRelated(qc),
  });
}

export function useCancelSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      salesApiHttp.cancel(id, reason),
    onSuccess: () => invalidateRelated(qc),
  });
}
