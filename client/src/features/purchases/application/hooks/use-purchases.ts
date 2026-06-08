'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsKey } from '@/features/products/application/hooks/use-products';
import { movementsKey } from '@/features/inventory/application/hooks/use-inventory';
import { fetchAllPaged } from '@/shared/lib/fetch-all-paged';
import { purchasesApiHttp } from '../../infrastructure/api/purchases.api.http';
import type {
  CreatePurchaseOrderInput,
  ListPurchaseOrdersParams,
  ReceivePurchaseOrderInput,
  UpdateFiscalDataInput,
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

export function usePurchaseOrders(
  params: ListPurchaseOrdersParams = {},
  opts: { fetchAll?: boolean; cap?: number } = {},
) {
  const fetchAll = opts.fetchAll ?? false;
  const cap = opts.cap ?? 2000;
  return useQuery({
    // El sufijo separa la caché de la vista paginada vs. la de "traer todo".
    queryKey: [...purchasesKey.list(params), fetchAll ? `all:${cap}` : 'page'],
    queryFn: () =>
      fetchAll
        ? fetchAllPaged((p) => purchasesApiHttp.list(p), params, { cap })
        : purchasesApiHttp.list(params),
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

/**
 * Edita SOLO el comprobante fiscal (606) de una compra existente. No mueve
 * stock ni costos, así que solo invalida las consultas de compras (la lista/
 * detalle reflejan el NCF; el 606 se regenera bajo demanda en su pantalla).
 */
export function useUpdatePurchaseFiscal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateFiscalDataInput) => purchasesApiHttp.updateFiscal(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: purchasesKey.all }),
  });
}
