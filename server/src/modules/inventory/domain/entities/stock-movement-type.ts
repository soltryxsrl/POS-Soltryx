export const StockMovementType = {
  PURCHASE: 'PURCHASE',
  SALE: 'SALE',
  RETURN: 'RETURN',
  ADJUSTMENT: 'ADJUSTMENT',
  CANCELLED_SALE: 'CANCELLED_SALE',
} as const;
export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];
