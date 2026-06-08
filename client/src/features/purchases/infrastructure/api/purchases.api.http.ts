import { http } from '@/shared/lib/http-client';
import type {
  CreatePurchaseOrderInput,
  ListPurchaseOrdersParams,
  PurchaseOrder,
  PurchaseOrdersList,
  ReceivePurchaseOrderInput,
  UpdateFiscalDataInput,
} from '../../domain/types';

export const purchasesApiHttp = {
  list: (params: ListPurchaseOrdersParams = {}) =>
    http<PurchaseOrdersList>('/purchase-orders', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),

  findById: (id: string) => http<PurchaseOrder>(`/purchase-orders/${id}`),

  create: (input: CreatePurchaseOrderInput) =>
    http<PurchaseOrder>('/purchase-orders', { method: 'POST', body: input }),

  receive: (id: string, input: ReceivePurchaseOrderInput) =>
    http<PurchaseOrder>(`/purchase-orders/${id}/receive`, {
      method: 'POST',
      body: input,
    }),

  cancel: (id: string, reason: string) =>
    http<PurchaseOrder>(`/purchase-orders/${id}/cancel`, {
      method: 'POST',
      body: { reason },
    }),

  updateFiscal: (id: string, input: UpdateFiscalDataInput) =>
    http<PurchaseOrder>(`/purchase-orders/${id}/fiscal`, {
      method: 'PATCH',
      body: input,
    }),
};
