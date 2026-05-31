import { http } from '@/shared/lib/http-client';
import type {
  CreateStockTransferInput,
  StockTransfer,
  StockTransfersList,
} from '../../domain/types';

export const stockTransfersApiHttp = {
  list: (params: { limit?: number; offset?: number } = {}) =>
    http<StockTransfersList>('/stock-transfers', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),

  findById: (id: string) => http<StockTransfer>(`/stock-transfers/${id}`),

  create: (input: CreateStockTransferInput) =>
    http<StockTransfer>('/stock-transfers', { method: 'POST', body: input }),

  receive: (id: string) =>
    http<StockTransfer>(`/stock-transfers/${id}/receive`, { method: 'POST' }),

  cancel: (id: string, reason?: string) =>
    http<StockTransfer>(`/stock-transfers/${id}/cancel`, {
      method: 'POST',
      body: { reason },
    }),
};
