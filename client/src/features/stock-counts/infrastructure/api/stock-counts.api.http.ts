import { http } from '@/shared/lib/http-client';
import type { StockCount, StockCountsList } from '../../domain/types';

export const stockCountsApiHttp = {
  list: (params: { limit?: number; offset?: number } = {}) =>
    http<StockCountsList>('/stock-counts', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),

  findById: (id: string) => http<StockCount>(`/stock-counts/${id}`),

  create: (notes?: string) =>
    http<StockCount>('/stock-counts', { method: 'POST', body: { notes } }),

  setItems: (id: string, items: Array<{ productId: string; countedQty: string }>) =>
    http<StockCount>(`/stock-counts/${id}/items`, { method: 'PUT', body: { items } }),

  complete: (id: string) =>
    http<StockCount>(`/stock-counts/${id}/complete`, { method: 'POST' }),

  cancel: (id: string) =>
    http<StockCount>(`/stock-counts/${id}/cancel`, { method: 'POST' }),
};
