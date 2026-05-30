'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryApiHttp } from '../../infrastructure/api/inventory.api.http';
import type { AdjustStockInput } from '../../domain/types';
import { productsKey } from '@/features/products/application/hooks/use-products';

export const movementsKey = {
  all: ['stock-movements'] as const,
  list: (params: { productId?: string; limit?: number; offset?: number }) =>
    ['stock-movements', params] as const,
};

export function useStockMovements(params: { productId?: string; limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: movementsKey.list(params),
    queryFn: () => inventoryApiHttp.listMovements(params),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdjustStockInput) => inventoryApiHttp.adjust(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productsKey.all });
      qc.invalidateQueries({ queryKey: movementsKey.all });
    },
  });
}
