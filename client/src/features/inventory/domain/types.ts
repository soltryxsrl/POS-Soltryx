import type { StockMovementType } from '@/shared/types/enums';

export interface StockMovement {
  id: string;
  branchId: string | null;
  productId: string;
  variantId: string | null;
  type: StockMovementType;
  quantity: string;
  previousStock: string;
  newStock: string;
  reason: string | null;
  saleId: string | null;
  userId: string;
  createdAt: string;
}

export interface StockMovementsList {
  items: StockMovement[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdjustStockInput {
  productId: string;
  variantId?: string | null;
  quantity: string;
  reason: string;
}

export interface ListStockMovementsParams {
  productId?: string;
  type?: StockMovementType;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
}
