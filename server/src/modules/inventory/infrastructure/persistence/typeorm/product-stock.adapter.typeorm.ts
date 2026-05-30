import { Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../../../../common/persistence/unit-of-work.port';
import type { ProductStockPort, ProductStockSnapshot } from '../../../domain/ports/product-stock.port';
import { ProductOrmEntity } from '../../../../products/product.orm-entity';

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
}
