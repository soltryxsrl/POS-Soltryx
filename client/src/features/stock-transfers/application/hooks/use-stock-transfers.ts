'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveBranchStore } from '@/features/branches/application/stores/active-branch.store';
import { stockTransfersApiHttp } from '../../infrastructure/api/stock-transfers.api.http';
import type { CreateStockTransferInput } from '../../domain/types';

export const stockTransfersKey = {
  all: ['stock-transfers'] as const,
  list: (branchId: string | null) => ['stock-transfers', 'list', branchId] as const,
};

export function useStockTransfers() {
  const branchId = useActiveBranchStore((s) => s.activeBranchId);
  return useQuery({
    queryKey: stockTransfersKey.list(branchId),
    queryFn: () => stockTransfersApiHttp.list({ limit: 100 }),
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
