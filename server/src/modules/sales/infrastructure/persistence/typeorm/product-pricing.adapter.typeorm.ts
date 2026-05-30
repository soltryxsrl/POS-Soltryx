import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import type { TransactionContext } from '../../../../../common/persistence/unit-of-work.port';
import { ProductOrmEntity } from '../../../../products/product.orm-entity';
import type {
  ProductPricingPort,
  ProductPricingSnapshot,
} from '../../../domain/ports/product-pricing.port';

@Injectable()
export class ProductPricingAdapterTypeOrm implements ProductPricingPort {
  async findManyForSale(
    ctx: TransactionContext,
    productIds: ReadonlyArray<string>,
  ): Promise<ProductPricingSnapshot[]> {
    if (productIds.length === 0) return [];
    const rows = await ctx.manager.find(ProductOrmEntity, {
      where: { id: In([...productIds]) },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      salePrice: p.salePrice,
      taxRate: p.taxRate,
      isActive: p.isActive && p.deletedAt === null,
    }));
  }
}
