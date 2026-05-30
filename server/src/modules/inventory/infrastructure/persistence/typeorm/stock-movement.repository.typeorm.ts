import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    type: e.type as StockMovementType,
    quantity: e.quantity,
    previousStock: e.previousStock,
    newStock: e.newStock,
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
      type: input.type,
      quantity: input.quantity,
      previousStock: input.previousStock,
      newStock: input.newStock,
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
    const qb = this.repo
      .createQueryBuilder('m')
      .orderBy('m.created_at', 'DESC')
      .take(limit)
      .skip(offset);
    if (input.productId) qb.andWhere('m.product_id = :pid', { pid: input.productId });
    const [items, total] = await qb.getManyAndCount();
    return { items: items.map(toDomain), total };
  }
}
