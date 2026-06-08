'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveBranchStore } from '@/features/branches/application/stores/active-branch.store';
import { fetchAllPaged } from '@/shared/lib/fetch-all-paged';
import { stockTransfersApiHttp } from '../../infrastructure/api/stock-transfers.api.http';
import type { CreateStockTransferInput } from '../../domain/types';

export const stockTransfersKey = {
  all: ['stock-transfers'] as const,
  list: (branchId: string | null) => ['stock-transfers', 'list', branchId] as const,
};

// Vista normal: trae las primeras 100 (sin paginación en UI). Al agrupar
// (`fetchAll`) trae el dataset completo hasta el tope, paginando por dentro.
export function useStockTransfers(opts: { fetchAll?: boolean; cap?: number } = {}) {
  const branchId = useActiveBranchStore((s) => s.activeBranchId);
  const fetchAll = opts.fetchAll ?? false;
  const cap = opts.cap ?? 2000;
  return useQuery({
    queryKey: [...stockTransfersKey.list(branchId), fetchAll ? `all:${cap}` : 'page'],
    queryFn: () =>
      fetchAll
        ? fetchAllPaged((p) => stockTransfersApiHttp.list(p), {}, { cap })
        : stockTransfersApiHttp.list({ limit: 100 }),
  });
}

export function useCreateStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStockTransferInput) => stockTransfersApiHttp.create(input),
    // La transferencia mueve stock → invalida transferencias y productos.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stockTransfersKey.all });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useReceiveStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => stockTransfersApiHttp.receive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stockTransfersKey.all });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useCancelStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; reason?: string }) =>
      stockTransfersApiHttp.cancel(input.id, input.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stockTransfersKey.all });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
