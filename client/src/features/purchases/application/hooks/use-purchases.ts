'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsKey } from '@/features/products/application/hooks/use-products';
import { movementsKey } from '@/features/inventory/application/hooks/use-inventory';
import { purchasesApiHttp } from '../../infrastructure/api/purchases.api.http';
import type {
  CreatePurchaseOrderInput,
  ListPurchaseOrdersParams,
  ReceivePurchaseOrderInput,
} from '../../domain/types';

export const purchasesKey = {
  all: ['purchases'] as const,
  list: (params: ListPurchaseOrdersParams) => ['purchases', 'list', params] as const,
  byId: (id: string) => ['purchases', 'byId', id] as const,
};

function invalidateRelated(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: purchasesKey.all });
  qc.invalidateQueries({ queryKey: productsKey.all });
  qc.invalidateQueries({ queryKey: movementsKey.all });
}

export function usePurchaseOrders(params: ListPurchaseOrdersParams = {}) {
  return useQuery({
    queryKey: purchasesKey.list(params),
    queryFn: () => purchasesApiHttp.list(params),
  });
}

export function usePurchaseOrder(id: string | undefined) {
  return useQuery({
    queryKey: purchasesKey.byId(id ?? '__none__'),
    queryFn: () => purchasesApiHttp.findById(id!),
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePurchaseOrderInput) => purchasesApiHttp.create(input),
    onSuccess: () => invalidateRelated(qc),
  });
}

export function useReceivePurchaseOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReceivePurchaseOrderInput) => purchasesApiHttp.receive(id, input),
    onSuccess: () => invalidateRelated(qc),
  });
}

export function useCancelPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      purchasesApiHttp.cancel(id, reason),
    onSuccess: () => invalidateRelated(qc),
  });
}
