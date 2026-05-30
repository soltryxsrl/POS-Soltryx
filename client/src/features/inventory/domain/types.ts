import type { StockMovementType } from '@/shared/types/enums';

export interface StockMovement {
  id: string;
  branchId: string | null;
  productId: string;
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
  quantity: string;
  reason: string;
}
