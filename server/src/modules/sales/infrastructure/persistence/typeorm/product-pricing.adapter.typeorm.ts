import { Injectable } from '@nestjs/common';
import { In, IsNull } from 'typeorm';
import type { TransactionContext } from '../../../../../common/persistence/unit-of-work.port';
import { ProductKitComponentOrmEntity } from '../../../../products/product-kit-component.orm-entity';
import { ProductVariantOrmEntity } from '../../../../products/product-variant.orm-entity';
import { ProductOrmEntity } from '../../../../products/product.orm-entity';
import type {
  ProductPricingPort,
  ProductPricingSnapshot,
  VariantPricingSnapshot,
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
    const kitIds = rows.filter((p) => p.isKit).map((p) => p.id);
    const kitMap = new Map<string, ProductPricingSnapshot['kitComponents']>();
    if (kitIds.length > 0) {
      const components = await ctx.manager.find(ProductKitComponentOrmEntity, {
        where: { kitProductId: In(kitIds) },
      });
      for (const c of components) {
        const arr = kitMap.get(c.kitProductId) ?? [];
        (arr as Array<{ componentProductId: string; quantity: string }>).push({
          componentProductId: c.componentProductId,
          quantity: c.quantity,
        });
        kitMap.set(c.kitProductId, arr);
      }
    }
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      salePrice: p.salePrice,
      taxRate: p.taxRate,
      isActive: p.isActive && p.deletedAt === null,
      isKit: p.isKit,
      kitComponents: kitMap.get(p.id) ?? [],
      hasVariants: p.hasVariants,
    }));
  }

  async findVariantsForSale(
    ctx: TransactionContext,
    variantIds: ReadonlyArray<string>,
  ): Promise<VariantPricingSnapshot[]> {
    if (variantIds.length === 0) return [];
    const rows = await ctx.manager.find(ProductVariantOrmEntity, {
      where: { id: In([...variantIds]), deletedAt: IsNull() },
    });
    return rows.map((v) => ({
      id: v.id,
      productId: v.productId,
      name: v.name,
      sku: v.sku,
      salePrice: v.salePrice,
      isActive: v.isActive,
    }));
  }
}
