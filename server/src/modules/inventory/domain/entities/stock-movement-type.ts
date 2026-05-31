export const StockMovementType = {
  PURCHASE: 'PURCHASE',
  SALE: 'SALE',
  RETURN: 'RETURN',
  ADJUSTMENT: 'ADJUSTMENT',
  CANCELLED_SALE: 'CANCELLED_SALE',
  /** Salida por transferencia a otra sucursal (-). */
  TRANSFER_OUT: 'TRANSFER_OUT',
  /** Entrada por transferencia desde otra sucursal (+). */
  TRANSFER_IN: 'TRANSFER_IN',
} as const;
export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];
