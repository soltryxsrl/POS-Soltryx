'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveBranchStore } from '@/features/branches/application/stores/active-branch.store';
import { fetchAllPaged } from '@/shared/lib/fetch-all-paged';
import { inventoryApiHttp } from '../../infrastructure/api/inventory.api.http';
import type { AdjustStockInput, ListStockMovementsParams } from '../../domain/types';
import { productsKey } from '@/features/products/application/hooks/use-products';

export const movementsKey = {
  all: ['stock-movements'] as const,
  // Incluye la sucursal activa: separa caché por sucursal y refetch determinista.
  list: (branchId: string | null, params: ListStockMovementsParams) =>
    ['stock-movements', branchId, params] as const,
};

export function useStockMovements(
  params: ListStockMovementsParams = {},
  opts: { fetchAll?: boolean; cap?: number } = {},
) {
  const branchId = useActiveBranchStore((s) => s.activeBranchId);
  const fetchAll = opts.fetchAll ?? false;
  const cap = opts.cap ?? 2000;
  return useQuery({
    // El sufijo separa la caché de la vista paginada vs. la de "traer todo".
    queryKey: [...movementsKey.list(branchId, params), fetchAll ? `all:${cap}` : 'page'],
    queryFn: () =>
      fetchAll
        ? fetchAllPaged((p) => inventoryApiHttp.listMovements(p), params, { cap })
        : inventoryApiHttp.listMovements(params),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdjustStockInput) => inventoryApiHttp.adjust(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: productsKey.all });
      qc.invalidateQueries({ queryKey: movementsKey.all });
      // Si el ajuste fue sobre una variante, refrescar variants del producto.
      if (vars.variantId) {
        qc.invalidateQueries({ queryKey: productsKey.variants(vars.productId) });
      }
    },
  });
}
