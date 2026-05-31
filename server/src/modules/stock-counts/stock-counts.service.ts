import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { assertSameBranch } from '../../common/branch/branch-scope.util';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
} from '../../common/persistence/unit-of-work.port';
import { StockMovementType } from '../inventory/domain/entities/stock-movement-type';
import {
  STOCK_MOVEMENT_RECORDER,
  type StockMovementRecorder,
} from '../inventory/domain/ports/stock-movement-recorder.port';
import { ProductOrmEntity } from '../products/product.orm-entity';
import type {
  CreateStockCountRequestDto,
  SetStockCountItemsRequestDto,
} from './dto/stock-count.request-dto';
import { StockCountItemOrmEntity } from './stock-count-item.orm-entity';
import { StockCountOrmEntity, StockCountStatus } from './stock-count.orm-entity';

export interface StockCountItemResponse {
  id: string;
  productId: string;
  productNameSnapshot: string;
  sku: string;
  countedQty: string;
  systemQty: string | null;
  variance: string | null;
  unitCost: string | null;
  /** variance × unitCost (valor de la merma/sobrante). Null mientras OPEN. */
  varianceValue: string | null;
}

export interface StockCountResponse {
  id: string;
  countNumber: string;
  branchId: string;
  status: StockCountStatus;
  notes: string | null;
  items: StockCountItemResponse[];
  itemsWithVariance: number;
  /** Suma neta de variance × costo (negativo = merma). Null mientras OPEN. */
  totalVarianceValue: string | null;
  createdById: string;
  completedById: string | null;
  completedAt: string | null;
  createdAt: string;
}

@Injectable()
export class StockCountsService {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(STOCK_MOVEMENT_RECORDER) private readonly stock: StockMovementRecorder,
    @InjectRepository(StockCountOrmEntity)
    private readonly counts: Repository<StockCountOrmEntity>,
    @InjectRepository(ProductOrmEntity)
    private readonly products: Repository<ProductOrmEntity>,
  ) {}

  async create(
    dto: CreateStockCountRequestDto,
    userId: string,
    branchId: string,
  ): Promise<StockCountResponse> {
    const id = await this.uow.run(async (ctx) => {
      const [{ nextval }] = await ctx.manager.query<{ nextval: string }[]>(
        `SELECT nextval('stock_count_seq') AS nextval`,
      );
      const countNumber = `CNT-${parseInt(nextval, 10).toString().padStart(6, '0')}`;
      const c = await ctx.manager.save(
        ctx.manager.create(StockCountOrmEntity, {
          countNumber,
          branchId,
          status: StockCountStatus.OPEN,
          notes: dto.notes?.trim() || null,
          createdById: userId,
        }),
      );
      return c.id;
    });
    return this.findById(id, branchId);
  }

  /** Reemplaza las líneas contadas (solo mientras OPEN). */
  async setItems(
    id: string,
    dto: SetStockCountItemsRequestDto,
    branchId: string,
  ): Promise<StockCountResponse> {
    const count = await this.loadOpen(id, branchId);

    const ids = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.products.find({
      where: { id: In(ids), branchId, deletedAt: IsNull() },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    for (const it of dto.items) {
      const p = byId.get(it.productId);
      if (!p) {
        throw new BadRequestException(`Producto ${it.productId} no existe en esta sucursal`);
      }
      if (p.isKit || p.hasVariants) {
        throw new BadRequestException(
          `"${p.name}": no se cuentan kits ni productos con variantes (su stock no es a nivel producto)`,
        );
      }
      if (Number(it.countedQty) < 0) {
        throw new BadRequestException(`Cantidad inválida para "${p.name}"`);
      }
    }

    await this.uow.run(async (ctx) => {
      await ctx.manager.delete(StockCountItemOrmEntity, { countId: count.id });
      for (const it of dto.items) {
        const p = byId.get(it.productId)!;
        await ctx.manager.save(
          ctx.manager.create(StockCountItemOrmEntity, {
            countId: count.id,
            productId: p.id,
            productNameSnapshot: p.name,
            sku: p.sku,
            countedQty: it.countedQty,
          }),
        );
      }
    });
    return this.findById(id, branchId);
  }

  /** Cierra el conteo: calcula varianza y aplica ADJUSTMENT por cada diferencia. */
  async complete(id: string, userId: string, branchId: string): Promise<StockCountResponse> {
    const count = await this.loadOpen(id, branchId);
    const items = await this.itemsRepo().find({ where: { countId: count.id } });
    if (items.length === 0) {
      throw new BadRequestException('El conteo no tiene líneas registradas');
    }

    await this.uow.run(async (ctx) => {
      for (const it of items) {
        const prod = await ctx.manager.findOne(ProductOrmEntity, {
          where: { id: it.productId },
          select: { id: true, stock: true, costPrice: true },
        });
        const systemQty = prod ? prod.stock : '0.000';
        const variance = (Number(it.countedQty) - Number(systemQty)).toFixed(3);
        if (Number(variance) !== 0) {
          await this.stock.record(ctx, {
            productId: it.productId,
            type: StockMovementType.ADJUSTMENT,
            quantity: variance, // signo: + sobrante, - merma → deja el stock en lo contado
            reason: `Conteo físico ${count.countNumber}`,
            userId,
            branchId,
          });
        }
        await ctx.manager.update(
          StockCountItemOrmEntity,
          { id: it.id },
          { systemQty, variance, unitCost: prod?.costPrice ?? '0.00' },
        );
      }
      await ctx.manager.update(
        StockCountOrmEntity,
        { id: count.id },
        { status: StockCountStatus.COMPLETED, completedAt: new Date(), completedById: userId },
      );
    });
    return this.findById(id, branchId);
  }

  async cancel(id: string, userId: string, branchId: string): Promise<StockCountResponse> {
    const count = await this.loadOpen(id, branchId);
    await this.counts.update(
      { id: count.id },
      { status: StockCountStatus.CANCELLED },
    );
    void userId;
    return this.findById(id, branchId);
  }

  async list(
    branchId: string,
    params: { limit?: number; offset?: number } = {},
  ): Promise<{ items: StockCountResponse[]; total: number }> {
    const limit = Math.min(params.limit ?? 50, 200);
    const offset = params.offset ?? 0;
    const [rows, total] = await this.counts
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.items', 'i')
      .where('c.branchId = :branchId', { branchId })
      .orderBy('c.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();
    return { items: rows.map((c) => toResponse(c)), total };
  }

  async findById(id: string, branchId: string): Promise<StockCountResponse> {
    const c = await this.counts.findOne({ where: { id }, relations: { items: true } });
    if (!c) throw new NotFoundException(`Conteo ${id} no encontrado`);
    assertSameBranch(c.branchId, branchId);
    return toResponse(c);
  }

  private itemsRepo(): Repository<StockCountItemOrmEntity> {
    return this.counts.manager.getRepository(StockCountItemOrmEntity);
  }

  private async loadOpen(id: string, branchId: string): Promise<StockCountOrmEntity> {
    const c = await this.counts.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Conteo ${id} no encontrado`);
    assertSameBranch(c.branchId, branchId);
    if (c.status !== StockCountStatus.OPEN) {
      throw new ConflictException(`El conteo está en estado ${c.status}`);
    }
    return c;
  }
}

function varianceValue(it: StockCountItemOrmEntity): string | null {
  if (it.variance === null || it.unitCost === null) return null;
  return (Number(it.variance) * Number(it.unitCost)).toFixed(2);
}

function toResponse(c: StockCountOrmEntity): StockCountResponse {
  const items = (c.items ?? []).map((i) => ({
    id: i.id,
    productId: i.productId,
    productNameSnapshot: i.productNameSnapshot,
    sku: i.sku,
    countedQty: i.countedQty,
    systemQty: i.systemQty,
    variance: i.variance,
    unitCost: i.unitCost,
    varianceValue: varianceValue(i),
  }));
  const completed = c.status === StockCountStatus.COMPLETED;
  const totalVarianceValue = completed
    ? items
        .reduce((acc, i) => acc + (i.varianceValue ? Number(i.varianceValue) : 0), 0)
        .toFixed(2)
    : null;
  return {
    id: c.id,
    countNumber: c.countNumber,
    branchId: c.branchId,
    status: c.status as StockCountStatus,
    notes: c.notes,
    items,
    itemsWithVariance: items.filter((i) => i.variance !== null && Number(i.variance) !== 0).length,
    totalVarianceValue,
    createdById: c.createdById,
    completedById: c.completedById,
    completedAt: c.completedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}
