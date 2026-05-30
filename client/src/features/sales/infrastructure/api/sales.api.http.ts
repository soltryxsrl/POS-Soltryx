import { http } from '@/shared/lib/http-client';
import type { SalesApi } from '../../domain/ports';
import type {
  CreateSaleInput,
  ListSalesParams,
  Sale,
  SalesList,
} from '../../domain/types';

export const salesApiHttp: SalesApi = {
  create: (input: CreateSaleInput) => http<Sale>('/sales', { method: 'POST', body: input }),

  findById: (id: string) => http<Sale>(`/sales/${id}`),

  list: (params?: ListSalesParams) =>
    http<SalesList>('/sales', {
      searchParams: params as Record<string, string | number | boolean | undefined> | undefined,
    }),

  cancel: (id: string, reason: string) =>
    http<Sale>(`/sales/${id}/cancel`, { method: 'POST', body: { reason } }),
};
