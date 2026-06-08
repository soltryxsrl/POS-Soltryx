'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveBranchStore } from '@/features/branches/application/stores/active-branch.store';
import { fetchAllPaged } from '@/shared/lib/fetch-all-paged';
import { stockCountsApiHttp } from '../../infrastructure/api/stock-counts.api.http';

export const stockCountsKey = {
  all: ['stock-counts'] as const,
  list: (branchId: string | null) => ['stock-counts', 'list', branchId] as const,
};

// Vista normal: trae los primeros 100 (sin paginación en UI). Al agrupar
// (`fetchAll`) trae el dataset completo hasta el tope, paginando por dentro.
export function useStockCounts(opts: { fetchAll?: boolean; cap?: number } = {}) {
  const branchId = useActiveBranchStore((s) => s.activeBranchId);
  const fetchAll = opts.fetchAll ?? false;
  const cap = opts.cap ?? 2000;
  return useQuery({
    queryKey: [...stockCountsKey.list(branchId), fetchAll ? `all:${cap}` : 'page'],
    queryFn: () =>
      fetchAll
        ? fetchAllPaged((p) => stockCountsApiHttp.list(p), {}, { cap })
        : stockCountsApiHttp.list({ limit: 100 }),
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
