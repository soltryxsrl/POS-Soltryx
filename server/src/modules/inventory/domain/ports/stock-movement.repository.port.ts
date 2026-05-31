import type { TransactionContext } from '../../../../common/persistence/unit-of-work.port';
import type { StockMovement } from '../entities/stock-movement.entity';
import type { StockMovementType } from '../entities/stock-movement-type';

export const STOCK_MOVEMENT_REPOSITORY = Symbol('STOCK_MOVEMENT_REPOSITORY');

export interface SaveStockMovementInput {
  branchId?: string | null;
  productId: string;
  variantId?: string | null;
  type: StockMovementType;
  quantity: string;
  previousStock: string;
  newStock: string;
  reason?: string | null;
  saleId?: string | null;
  userId: string;
}

export interface ListStockMovementsInput {
  productId?: string;
  type?: StockMovementType;
  branchId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
}

export interface StockMovementRepository {
  save(ctx: TransactionContext, input: SaveStockMovementInput): Promise<StockMovement>;
  list(
    input: ListStockMovementsInput,
  ): Promise<{ items: StockMovement[]; total: number }>;
}
