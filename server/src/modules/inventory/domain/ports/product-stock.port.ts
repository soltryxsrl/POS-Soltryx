import type { TransactionContext } from '../../../../common/persistence/unit-of-work.port';

export const PRODUCT_STOCK_PORT = Symbol('PRODUCT_STOCK_PORT');

export interface ProductStockSnapshot {
  productId: string;
  branchId: string | null;
  stock: string;
}

export interface VariantStockSnapshot {
  variantId: string;
  productId: string;
  stock: string;
}

/**
 * Lectura y escritura del campo `stock` de productos. Implementado por Inventory
 * para que sea Inventory el único módulo que escribe ese campo.
 *
 * `lockForUpdate` debe usar `SELECT ... FOR UPDATE` para serializar movimientos
 * concurrentes sobre el mismo producto dentro de la transacción.
 */
export interface ProductStockPort {
  lockForUpdate(ctx: TransactionContext, productId: string): Promise<ProductStockSnapshot | null>;
  updateStock(ctx: TransactionContext, productId: string, newStock: string): Promise<void>;
  /** Mismo patrón pero para una variante. Retorna null si no existe. */
  lockVariantForUpdate(
    ctx: TransactionContext,
    variantId: string,
  ): Promise<VariantStockSnapshot | null>;
  updateVariantStock(
    ctx: TransactionContext,
    variantId: string,
    newStock: string,
  ): Promise<void>;
}
