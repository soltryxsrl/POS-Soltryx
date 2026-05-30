import type { StockMovementType } from './stock-movement-type';

/**
 * Movimiento de stock persistido. Snapshot inmutable.
 */
export interface StockMovement {
  readonly id: string;
  readonly branchId: string | null;
  readonly productId: string;
  readonly type: StockMovementType;
  /** Siempre positiva en SALE/PURCHASE/RETURN/CANCELLED_SALE. Signada en ADJUSTMENT. */
  readonly quantity: string;
  readonly previousStock: string;
  readonly newStock: string;
  readonly reason: string | null;
  readonly saleId: string | null;
  readonly userId: string;
  readonly createdAt: Date;
}
