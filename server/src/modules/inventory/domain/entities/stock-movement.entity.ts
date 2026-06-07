import type { StockMovementType } from './stock-movement-type';

/**
 * Movimiento de stock persistido. Snapshot inmutable.
 */
export interface StockMovement {
  readonly id: string;
  readonly branchId: string | null;
  readonly productId: string;
  /** Si la línea fue de una variante, su id. */
  readonly variantId: string | null;
  readonly type: StockMovementType;
  /** Siempre positiva en SALE/PURCHASE/RETURN/CANCELLED_SALE. Signada en ADJUSTMENT. */
  readonly quantity: string;
  readonly previousStock: string;
  readonly newStock: string;
  /** Costo unitario del movimiento (base promedio móvil; compras = costo recibido). NULL = histórico. */
  readonly unitCost: string | null;
  readonly reason: string | null;
  readonly saleId: string | null;
  readonly userId: string;
  readonly createdAt: Date;
  /** Nombre del producto. Sólo se puebla en la consulta de lista (kardex). */
  readonly productName?: string | null;
  /** SKU del producto. Sólo en lista. */
  readonly sku?: string | null;
  /** Nombre de la variante, si el movimiento fue de una variante. Sólo en lista. */
  readonly variantName?: string | null;
}
