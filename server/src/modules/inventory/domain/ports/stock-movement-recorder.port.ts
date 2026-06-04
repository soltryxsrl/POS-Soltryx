import type { TransactionContext } from '../../../../common/persistence/unit-of-work.port';
import type { StockMovement } from '../entities/stock-movement.entity';
import type { StockMovementType } from '../entities/stock-movement-type';

export const STOCK_MOVEMENT_RECORDER = Symbol('STOCK_MOVEMENT_RECORDER');

export interface RecordStockMovementInput {
  productId: string;
  /** Si se provee, el movimiento descuenta/abona stock de la variante en vez del producto padre. */
  variantId?: string | null;
  type: StockMovementType;
  /**
   * Cantidad. Para SALE/PURCHASE/RETURN/CANCELLED_SALE debe ser positiva.
   * Para ADJUSTMENT puede ser positiva ("+5") o negativa ("-3").
   */
  quantity: string;
  reason?: string | null;
  saleId?: string | null;
  userId: string;
  branchId?: string | null;
  /**
   * Costo unitario a registrar. Si se omite, el recorder usa la base de costo
   * actual del producto/variante (promedio móvil). Las compras lo pasan con el
   * costo recibido.
   */
  unitCost?: string | null;
}

/**
 * Puerto público de Inventory para otros módulos (Products, Sales, etc.).
 * El adapter implementador hace TODO dentro del contexto transaccional dado:
 *   1) `SELECT ... FOR UPDATE` del producto
 *   2) calcular nuevo stock y validar
 *   3) persistir stock_movement
 *   4) actualizar product.stock
 */
export interface StockMovementRecorder {
  record(ctx: TransactionContext, input: RecordStockMovementInput): Promise<StockMovement>;
}
