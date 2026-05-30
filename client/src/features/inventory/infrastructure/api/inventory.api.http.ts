import { http } from '@/shared/lib/http-client';
import type {
  AdjustStockInput,
  ListStockMovementsParams,
  StockMovement,
  StockMovementsList,
} from '../../domain/types';

export const inventoryApiHttp = {
  adjust: (input: AdjustStockInput) =>
    http<StockMovement>('/inventory/adjust', { method: 'POST', body: input }),

  listMovements: (params: ListStockMovementsParams = {}) =>
    http<StockMovementsList>('/inventory/movements', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),
};
