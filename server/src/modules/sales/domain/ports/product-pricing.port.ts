import type { TransactionContext } from '../../../../common/persistence/unit-of-work.port';

export const PRODUCT_PRICING_PORT = Symbol('PRODUCT_PRICING_PORT');

export interface ProductPricingSnapshot {
  id: string;
  name: string;
  sku: string;
  salePrice: string;
  taxRate: string;
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
}
