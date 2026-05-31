'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveBranchStore } from '@/features/branches/application/stores/active-branch.store';
import { stockCountsApiHttp } from '../../infrastructure/api/stock-counts.api.http';

export const stockCountsKey = {
  all: ['stock-counts'] as const,
  list: (branchId: string | null) => ['stock-counts', 'list', branchId] as const,
};

export function useStockCounts() {
  const branchId = useActiveBranchStore((s) => s.activeBranchId);
  return useQuery({
    queryKey: stockCountsKey.list(branchId),
    queryFn: () => stockCountsApiHttp.list({ limit: 100 }),
  });
}

/**
 * Ejecuta un conteo de una sola pasada: crea el documento, registra las líneas
 * y lo completa (aplica los ajustes de varianza). Devuelve el conteo con la
 * varianza calculada. Invalida conteos + productos (cambió el stock).
 */
export function useRunStockCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      notes?: string;
      items: Array<{ productId: string; countedQty: string }>;
    }) => {
      const created = await stockCountsApiHttp.create(input.notes);
      await stockCountsApiHttp.setItems(created.id, input.items);
      return stockCountsApiHttp.complete(created.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stockCountsKey.all });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
