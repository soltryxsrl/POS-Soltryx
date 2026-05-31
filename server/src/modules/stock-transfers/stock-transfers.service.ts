import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
} from '../../common/persistence/unit-of-work.port';
import { BranchOrmEntity } from '../branches/branch.orm-entity';
import { BranchesService } from '../branches/branches.service';
import { StockMovementType } from '../inventory/domain/entities/stock-movement-type';
import {
  STOCK_MOVEMENT_RECORDER,
  type StockMovementRecorder,
} from '../inventory/domain/ports/stock-movement-recorder.port';
import { ProductOrmEntity } from '../products/product.orm-entity';
import type { CreateStockTransferRequestDto } from './dto/create-stock-transfer.request-dto';
import { StockTransferItemOrmEntity } from './stock-transfer-item.orm-entity';
import {
  StockTransferOrmEntity,
  StockTransferStatus,
} from './stock-transfer.orm-entity';

export interface StockTransferItemResponse {
  id: string;
  sku: string;
  productNameSnapshot: string;
  sourceProductId: string;
  destProductId: string;
  quantity: string;
}

export interface StockTransferResponse {
  id: string;
  transferNumber: string;
  sourceBranchId: string;
  sourceBranchName: string | null;
  destBranchId: string;
  destBranchName: string | null;
  status: StockTransferStatus;
  notes: string | null;
  items: StockTransferItemResponse[];
  createdById: string;
  receivedById: string | null;
  receivedAt: string | null;
  cancelledById: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

@Injectable()
export class StockTransfersService {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(STOCK_MOVEMENT_RECORDER) private readonly stock: StockMovementRecorder,
    @InjectRepository(StockTransferOrmEntity)
    private readonly transfers: Repository<StockTransferOrmEntity>,
    @InjectRepository(ProductOrmEntity)
    private readonly products: Repository<ProductOrmEntity>,
    @InjectRepository(BranchOrmEntity)
    private readonly branchesRepo: Repository<BranchOrmEntity>,
    private readonly branches: BranchesService,
  ) {}

  async create(
    dto: CreateStockTransferRequestDto,
    userId: string,
    sourceBranchId: string,
  ): Promise<StockTransferResponse> {
    if (dto.destBranchId === sourceBranchId) {
      throw new BadRequestException('La sucursal origen y destino no pueden ser la misma');
    }
    if (!(await this.branches.isActiveBranch(dto.destBranchId))) {
      throw new NotFoundException('La sucursal destino no existe o está inactiva');
    }

    const sourceIds = [...new Set(dto.items.map((i) => i.productId))];
    const sourceProducts = await this.products.find({
      where: { id: In(sourceIds), branchId: sourceBranchId, deletedAt: IsNull() },
    });
    const sourceById = new Map(sourceProducts.map((p) => [p.id, p]));

    // Resolver el producto equivalente (mismo SKU) en la sucursal destino.
    const skus = sourceProducts.map((p) => p.sku);
    const destProducts = skus.length
      ? await this.products.find({
          where: { sku: In(skus), branchId: dto.destBranchId, deletedAt: IsNull() },
        })
      : [];
    const destBySku = new Map(destProducts.map((p) => [p.sku, p]));

    const drafts: Array<{
      source: ProductOrmEntity;
      destId: string;
      quantity: string;
    }> = [];
    for (const it of dto.items) {
      const source = sourceById.get(it.productId);
      if (!source) {
        throw new BadRequestException(
          `Producto ${it.productId} no existe en la sucursal origen`,
        );
      }
      if (source.isKit || source.hasVariants) {
        throw new BadRequestException(
          `"${source.name}": no se pueden transferir kits ni productos con variantes (aún)`,
        );
      }
      if (Number(it.quantity) <= 0) {
        throw new BadRequestException(`Cantidad inválida para "${source.name}"`);
      }
      const dest = destBySku.get(source.sku);
      if (!dest) {
        throw new BadRequestException(
          `"${source.name}" (SKU ${source.sku}) no existe en la sucursal destino. Clona el catálogo primero.`,
        );
      }
      drafts.push({ source, destId: dest.id, quantity: it.quantity });
    }

    const id = await this.uow.run(async (ctx) => {
      const m = ctx.manager;
      const [{ nextval }] = await m.query<{ nextval: string }[]>(
        `SELECT nextval('stock_transfer_seq') AS nextval`,
      );
      const transferNumber = `ST-${parseInt(nextval, 10).toString().padStart(6, '0')}`;

      const transfer = await m.save(
        m.create(StockTransferOrmEntity, {
          transferNumber,
          sourceBranchId,
          destBranchId: dto.destBranchId,
          status: StockTransferStatus.IN_TRANSIT,
          notes: dto.notes?.trim() || null,
          createdById: userId,
        }),
      );

      for (const d of drafts) {
        await m.save(
          m.create(StockTransferItemOrmEntity, {
            transferId: transfer.id,
            sourceProductId: d.source.id,
            destProductId: d.destId,
            productNameSnapshot: d.source.name,
            sku: d.source.sku,
            quantity: d.quantity,
          }),
        );
        // Sale del origen ahora (queda en tránsito hasta que el destino reciba).
        await this.stock.record(ctx, {
          productId: d.source.id,
          type: StockMovementType.TRANSFER_OUT,
          quantity: d.quantity,
          reason: `Transferencia ${transferNumber} → sucursal destino`,
          userId,
          branchId: sourceBranchId,
        });
      }
      return transfer.id;
    });

    return this.findById(id, sourceBranchId);
  }

  async receive(id: string, userId: string, branchId: string): Promise<StockTransferResponse> {
    const t = await this.transfers.findOne({ where: { id }, relations: { items: true } });
    if (!t) throw new NotFoundException(`Transferencia ${id} no encontrada`);
    if (t.destBranchId !== branchId) {
      throw new ForbiddenException('Solo la sucursal destino puede recibir esta transferencia');
    }
    if (t.status !== StockTransferStatus.IN_TRANSIT) {
      throw new ConflictException(`La transferencia está en estado ${t.status}`);
    }
    await this.uow.run(async (ctx) => {
      for (const it of t.items) {
        await this.stock.record(ctx, {
          productId: it.destProductId,
          type: StockMovementType.TRANSFER_IN,
          quantity: it.quantity,
          reason: `Transferencia ${t.transferNumber} recibida`,
          userId,
          branchId: t.destBranchId,
        });
      }
      await ctx.manager.update(
        StockTransferOrmEntity,
        { id: t.id },
        { status: StockTransferStatus.RECEIVED, receivedAt: new Date(), receivedById: userId },
      );
    });
    return this.findById(id, branchId);
  }

  async cancel(
    id: string,
    userId: string,
    branchId: string,
    reason?: string,
  ): Promise<StockTransferResponse> {
    const t = await this.transfers.findOne({ where: { id }, relations: { items: true } });
    if (!t) throw new NotFoundException(`Transferencia ${id} no encontrada`);
    if (t.sourceBranchId !== branchId) {
      throw new ForbiddenException('Solo la sucursal origen puede cancelar esta transferencia');
    }
    if (t.status !== StockTransferStatus.IN_TRANSIT) {
      throw new ConflictException(`La transferencia está en estado ${t.status}`);
    }
    await this.uow.run(async (ctx) => {
      // Restituir el stock al origen (revertir el TRANSFER_OUT).
      for (const it of t.items) {
        await this.stock.record(ctx, {
          productId: it.sourceProductId,
          type: StockMovementType.TRANSFER_IN,
          quantity: it.quantity,
          reason: `Transferencia ${t.transferNumber} cancelada (restitución)`,
          userId,
          branchId: t.sourceBranchId,
        });
      }
      await ctx.manager.update(
        StockTransferOrmEntity,
        { id: t.id },
        {
          status: StockTransferStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledById: userId,
          cancelReason: reason?.trim() || null,
        },
      );
    });
    return this.findById(id, branchId);
  }

  /** Lista transferencias donde la sucursal activa es origen O destino. */
  async list(
    branchId: string,
    params: { limit?: number; offset?: number } = {},
  ): Promise<{ items: StockTransferResponse[]; total: number }> {
    const limit = Math.min(params.limit ?? 50, 200);
    const offset = params.offset ?? 0;
    const [rows, total] = await this.transfers
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.items', 'i')
      .where('(t.sourceBranchId = :b OR t.destBranchId = :b)', { b: branchId })
      .orderBy('t.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();
    const names = await this.branchNames([
      ...new Set(rows.flatMap((t) => [t.sourceBranchId, t.destBranchId])),
    ]);
    return { items: rows.map((t) => this.toResponse(t, names)), total };
  }

  async findById(id: string, branchId: string): Promise<StockTransferResponse> {
    const t = await this.transfers.findOne({ where: { id }, relations: { items: true } });
    if (!t) throw new NotFoundException(`Transferencia ${id} no encontrada`);
    if (t.sourceBranchId !== branchId && t.destBranchId !== branchId) {
      throw new ForbiddenException('La transferencia no pertenece a tu sucursal');
    }
    const names = await this.branchNames([t.sourceBranchId, t.destBranchId]);
    return this.toResponse(t, names);
  }

  private async branchNames(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.branchesRepo.find({ where: { id: In(ids) }, select: { id: true, name: true } });
    return new Map(rows.map((b) => [b.id, b.name]));
  }

  private toResponse(
    t: StockTransferOrmEntity,
    names: Map<string, string>,
  ): StockTransferResponse {
    return {
      id: t.id,
      transferNumber: t.transferNumber,
      sourceBranchId: t.sourceBranchId,
      sourceBranchName: names.get(t.sourceBranchId) ?? null,
      destBranchId: t.destBranchId,
      destBranchName: names.get(t.destBranchId) ?? null,
      status: t.status as StockTransferStatus,
      notes: t.notes,
      items: (t.items ?? []).map((i) => ({
        id: i.id,
        sku: i.sku,
        productNameSnapshot: i.productNameSnapshot,
        sourceProductId: i.sourceProductId,
        destProductId: i.destProductId,
        quantity: i.quantity,
      })),
      createdById: t.createdById,
      receivedById: t.receivedById,
      receivedAt: t.receivedAt?.toISOString() ?? null,
      cancelledById: t.cancelledById,
      cancelledAt: t.cancelledAt?.toISOString() ?? null,
      cancelReason: t.cancelReason,
      createdAt: t.createdAt.toISOString(),
    };
  }
}
