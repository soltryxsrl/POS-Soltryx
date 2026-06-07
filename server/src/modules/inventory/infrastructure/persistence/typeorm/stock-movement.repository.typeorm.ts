import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductOrmEntity } from '../../../../products/product.orm-entity';
import { ProductVariantOrmEntity } from '../../../../products/product-variant.orm-entity';
import { resolveSort } from '../../../../../common/dto/pagination-sort.query';
import type { TransactionContext } from '../../../../../common/persistence/unit-of-work.port';
import type { StockMovement } from '../../../domain/entities/stock-movement.entity';
import type { StockMovementType } from '../../../domain/entities/stock-movement-type';
import type {
  ListStockMovementsInput,
  SaveStockMovementInput,
  StockMovementRepository,
} from '../../../domain/ports/stock-movement.repository.port';
import { StockMovementOrmEntity } from './stock-movement.orm-entity';

function toDomain(e: StockMovementOrmEntity): StockMovement {
  return {
    id: e.id,
    branchId: e.branchId,
    productId: e.productId,
    variantId: e.variantId,
    type: e.type as StockMovementType,
    quantity: e.quantity,
    previousStock: e.previousStock,
    newStock: e.newStock,
    unitCost: e.unitCost,
    reason: e.reason,
    saleId: e.saleId,
    userId: e.userId,
    createdAt: e.createdAt,
  };
}

@Injectable()
export class StockMovementRepositoryTypeOrm implements StockMovementRepository {
  constructor(
    @InjectRepository(StockMovementOrmEntity)
    private readonly repo: Repository<StockMovementOrmEntity>,
  ) {}

  async save(ctx: TransactionContext, input: SaveStockMovementInput): Promise<StockMovement> {
    const repo = ctx.manager.getRepository(StockMovementOrmEntity);
    const entity = repo.create({
      branchId: input.branchId ?? null,
      productId: input.productId,
      variantId: input.variantId ?? null,
      type: input.type,
      quantity: input.quantity,
      previousStock: input.previousStock,
      newStock: input.newStock,
      unitCost: input.unitCost ?? null,
      reason: input.reason ?? null,
      saleId: input.saleId ?? null,
      userId: input.userId,
    });
    const saved = await repo.save(entity);
    return toDomain(saved);
  }

  async list(input: ListStockMovementsInput): Promise<{ items: StockMovement[]; total: number }> {
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    const sort = resolveSort(
      input.sort,
      input.sortDir,
      ['createdAt', 'quantity'] as const,
      { column: 'createdAt', dir: 'desc' },
    );
    const sortColumnMap = {
      createdAt: 'm.created_at',
      quantity: 'm.quantity',
    } as const;
    const qb = this.repo
      .createQueryBuilder('m')
      .orderBy(sortColumnMap[sort.column], sort.dir.toUpperCase() as 'ASC' | 'DESC')
      .take(limit)
      .skip(offset);
    if (input.productId) qb.andWhere('m.product_id = :pid', { pid: input.productId });
    if (input.branchId) qb.andWhere('m.branch_id = :branchId', { branchId: input.branchId });
    if (input.type) qb.andWhere('m.type = :type', { type: input.type });
    if (input.from) qb.andWhere('m.created_at >= :from', { from: input.from });
    if (input.to) qb.andWhere('m.created_at <= :to', { to: input.to });
    const [rows, total] = await qb.getManyAndCount();
    const items = await this.attachItemLabels(rows.map(toDomain));
    return { items, total };
  }

  /**
   * Enriquece los movimientos con el nombre/SKU del producto (y nombre de la
   * variante). Lote por `IN` sobre los ids de la página — no hace JOIN para no
   * arriesgar el conteo ni multiplicar filas. `withDeleted` para que un producto
   * dado de baja siga mostrando su nombre en el histórico.
   */
  private async attachItemLabels(items: StockMovement[]): Promise<StockMovement[]> {
    if (items.length === 0) return items;

    const productIds = [...new Set(items.map((m) => m.productId))];
    const variantIds = [
      ...new Set(items.map((m) => m.variantId).filter((v): v is string => !!v)),
    ];

    const products = await this.repo.manager.getRepository(ProductOrmEntity).find({
      where: { id: In(productIds) },
      select: { id: true, name: true, sku: true },
      withDeleted: true,
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    const variants = variantIds.length
      ? await this.repo.manager.getRepository(ProductVariantOrmEntity).find({
          where: { id: In(variantIds) },
          select: { id: true, name: true },
          withDeleted: true,
        })
      : [];
    const variantById = new Map(variants.map((v) => [v.id, v]));

    return items.map((m) => ({
      ...m,
      productName: productById.get(m.productId)?.name ?? null,
      sku: productById.get(m.productId)?.sku ?? null,
      variantName: m.variantId ? (variantById.get(m.variantId)?.name ?? null) : null,
    }));
  }

  async listChronological(productId: string, branchId: string): Promise<StockMovement[]> {
    const rows = await this.repo
      .createQueryBuilder('m')
      .where('m.product_id = :pid', { pid: productId })
      .andWhere('m.branch_id = :branchId', { branchId })
      // created_at asc + id como desempate determinista (movimientos del mismo
      // instante, p. ej. explosión de kit). El orden no altera el promedio final.
      .orderBy('m.created_at', 'ASC')
      .addOrderBy('m.id', 'ASC')
      .getMany();
    return rows.map(toDomain);
  }
}
