import { Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../../../../common/persistence/unit-of-work.port';
import type {
  ProductStockPort,
  ProductStockSnapshot,
  VariantStockSnapshot,
} from '../../../domain/ports/product-stock.port';
import { ProductOrmEntity } from '../../../../products/product.orm-entity';
import { ProductVariantOrmEntity } from '../../../../products/product-variant.orm-entity';

@Injectable()
export class ProductStockAdapterTypeOrm implements ProductStockPort {
  async lockForUpdate(
    ctx: TransactionContext,
    productId: string,
  ): Promise<ProductStockSnapshot | null> {
    const row = await ctx.manager
      .createQueryBuilder(ProductOrmEntity, 'p')
      .setLock('pessimistic_write')
      .where('p.id = :id', { id: productId })
      .andWhere('p.deleted_at IS NULL')
      .getOne();
    if (!row) return null;
    return {
      productId: row.id,
      branchId: row.branchId,
      stock: row.stock,
    };
  }

  async updateStock(ctx: TransactionContext, productId: string, newStock: string): Promise<void> {
    await ctx.manager.update(ProductOrmEntity, { id: productId }, { stock: newStock });
  }

  async lockVariantForUpdate(
    ctx: TransactionContext,
    variantId: string,
  ): Promise<VariantStockSnapshot | null> {
    const row = await ctx.manager
      .createQueryBuilder(ProductVariantOrmEntity, 'v')
      .setLock('pessimistic_write')
      .where('v.id = :id', { id: variantId })
      .andWhere('v.deleted_at IS NULL')
      .getOne();
    if (!row) return null;
    return {
      variantId: row.id,
      productId: row.productId,
      stock: row.stock,
    };
  }

  async updateVariantStock(
    ctx: TransactionContext,
    variantId: string,
    newStock: string,
  ): Promise<void> {
    await ctx.manager.update(
      ProductVariantOrmEntity,
      { id: variantId },
      { stock: newStock },
    );
  }
}
