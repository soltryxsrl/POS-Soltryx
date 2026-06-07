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
  /** Costo unitario del movimiento (base promedio móvil; compras = costo recibido). null = histórico. */
  unitCost: string | null;
  /** Costo promedio móvil vigente tras el movimiento (solo en kardex por producto). */
  avgCost: string | null;
  /** Valor del inventario tras el movimiento = stock × promedio (solo por producto). */
  balanceValue: string | null;
  reason: string | null;
  saleId: string | null;
  userId: string;
  createdAt: string;
  /** Nombre del producto del movimiento (kardex global). */
  productName: string | null;
  /** SKU del producto. */
  sku: string | null;
  /** Nombre de la variante, si el movimiento fue de una variante. */
  variantName: string | null;
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
