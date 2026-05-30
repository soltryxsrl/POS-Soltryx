import type { TransactionContext } from '../../../../common/persistence/unit-of-work.port';

export const PRODUCT_PRICING_PORT = Symbol('PRODUCT_PRICING_PORT');

export interface ProductPricingSnapshot {
  id: string;
  name: string;
  sku: string;
  salePrice: string;
  taxRate: string;
  isActive: boolean;
  /** Si true, al venderlo el stock se descuenta de sus componentes. */
  isKit: boolean;
  /** Receta del kit (vacía si !isKit). */
  kitComponents: ReadonlyArray<{
    componentProductId: string;
    /** Cantidad por 1 kit vendido. */
    quantity: string;
  }>;
  /** Si true, las ventas DEBEN especificar variantId. */
  hasVariants: boolean;
}

export interface VariantPricingSnapshot {
  id: string;
  productId: string;
  name: string;
  sku: string;
  /** Override del precio del padre, o null si hereda. */
  salePrice: string | null;
  isActive: boolean;
}

/**
 * Lee el snapshot de precio/nombre/sku/tax de productos para construir
 * la venta con datos del SERVIDOR (nunca confiar en el cliente).
 */
export interface ProductPricingPort {
  findManyForSale(
    ctx: TransactionContext,
    productIds: ReadonlyArray<string>,
  ): Promise<ProductPricingSnapshot[]>;
  findVariantsForSale(
    ctx: TransactionContext,
    variantIds: ReadonlyArray<string>,
  ): Promise<VariantPricingSnapshot[]>;
}
