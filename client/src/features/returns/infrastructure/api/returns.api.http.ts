import { http } from '@/shared/lib/http-client';
import type {
  CreateReturnInput,
  ListReturnsParams,
  ReturnableItem,
  ReturnsList,
  SaleReturn,
} from '../../domain/types';

export const returnsApiHttp = {
  list: (params: ListReturnsParams = {}) =>
    http<ReturnsList>('/returns', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),

  listForSale: (saleId: string) =>
    http<SaleReturn[]>(`/sales/${saleId}/returns`),

  findById: (id: string) => http<SaleReturn>(`/returns/${id}`),

  returnable: (saleId: string) =>
    http<ReturnableItem[]>(`/sales/${saleId}/returnable-items`),

  create: (input: CreateReturnInput) =>
    http<SaleReturn>('/returns', { method: 'POST', body: input }),
};
