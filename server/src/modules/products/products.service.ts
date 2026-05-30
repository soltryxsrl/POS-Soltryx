import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, IsNull, Repository } from 'typeorm';
import { UNIT_OF_WORK, type UnitOfWork } from '../../common/persistence/unit-of-work.port';
import {
  STOCK_MOVEMENT_RECORDER,
  type StockMovementRecorder,
} from '../inventory/domain/ports/stock-movement-recorder.port';
import { ProductOrmEntity } from './product.orm-entity';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ListProductsQuery } from './dto/list-products.query';
import type { UpdateProductDto } from './dto/update-product.dto';

export interface PagedProducts {
  items: ProductOrmEntity[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductOrmEntity)
    private readonly repo: Repository<ProductOrmEntity>,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    /**
     * Opcional para evitar dependencia circular si se reutiliza este service en tests
     * sin el módulo Inventory cargado.
     */
    @Optional()
    @Inject(STOCK_MOVEMENT_RECORDER)
    private readonly stockRecorder: StockMovementRecorder | null,
  ) {}

  async list(q: ListProductsQuery): Promise<PagedProducts> {
    const limit = q.limit ?? 50;
    const offset = q.offset ?? 0;
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .where('p.deleted_at IS NULL')
      .orderBy('p.name', 'ASC')
      .take(limit)
      .skip(offset);

    if (q.q) {
      const term = `%${q.q.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((b) => {
          b.where('LOWER(p.name) LIKE :t', { t: term })
            .orWhere('LOWER(p.sku) LIKE :t', { t: term })
            .orWhere('LOWER(p.barcode) LIKE :t', { t: term });
        }),
      );
    }
    if (q.categoryId) qb.andWhere('p.category_id = :cid', { cid: q.categoryId });
    if (typeof q.isActive === 'boolean')
      qb.andWhere('p.is_active = :ia', { ia: q.isActive });
    if (q.lowStock) qb.andWhere('p.stock <= p.min_stock');

    const [items, total] = await qb.getManyAndCount();
    return { items, total, limit, offset };
  }

  async findById(id: string): Promise<ProductOrmEntity> {
    const p = await this.repo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: { category: true },
    });
    if (!p) throw new NotFoundException(`Producto ${id} no encontrado`);
    return p;
  }

  /**
   * Crea producto y, si se provee `initialStock > 0`, registra un movimiento PURCHASE
   * — todo dentro de la misma transacción.
   */
  async create(dto: CreateProductDto, actorUserId: string): Promise<ProductOrmEntity> {
    return this.uow.run(async ({ manager }) => {
      await this.assertSkuFree(manager, dto.sku);
      if (dto.barcode) await this.assertBarcodeFree(manager, dto.barcode);

      const product = manager.create(ProductOrmEntity, {
        name: dto.name,
        sku: dto.sku,
        barcode: dto.barcode ?? null,
        description: dto.description ?? null,
        categoryId: dto.categoryId ?? null,
        costPrice: dto.costPrice ?? '0.00',
        salePrice: dto.salePrice,
        taxRate: dto.taxRate ?? '0.00',
        minStock: dto.minStock ?? '0.000',
        stock: '0.000',
        isActive: dto.isActive ?? true,
      });
      const saved = await manager.save(ProductOrmEntity, product);

      const initial = dto.initialStock;
      if (initial && Number(initial) > 0 && this.stockRecorder) {
        await this.stockRecorder.record(
          { manager },
          {
            productId: saved.id,
            type: 'PURCHASE',
            quantity: initial,
            reason: 'Stock inicial',
            userId: actorUserId,
          },
        );
        // releer para devolver el stock actualizado
        const refreshed = await manager.findOne(ProductOrmEntity, {
          where: { id: saved.id },
          relations: { category: true },
        });
        if (refreshed) return refreshed;
      }
      return saved;
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductOrmEntity> {
    const current = await this.findById(id);
    if (dto.sku && dto.sku !== current.sku) {
      await this.assertSkuFree(this.repo.manager, dto.sku, id);
    }
    if (dto.barcode && dto.barcode !== current.barcode) {
      await this.assertBarcodeFree(this.repo.manager, dto.barcode, id);
    }

    // Aplicamos solo campos permitidos — stock NO se toca aquí.
    const patch: Partial<ProductOrmEntity> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.sku !== undefined) patch.sku = dto.sku;
    if (dto.barcode !== undefined) patch.barcode = dto.barcode;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.categoryId !== undefined) patch.categoryId = dto.categoryId;
    if (dto.costPrice !== undefined) patch.costPrice = dto.costPrice;
    if (dto.salePrice !== undefined) patch.salePrice = dto.salePrice;
    if (dto.taxRate !== undefined) patch.taxRate = dto.taxRate;
    if (dto.minStock !== undefined) patch.minStock = dto.minStock;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    Object.assign(current, patch);
    return this.repo.save(current);
  }

  async softDelete(id: string): Promise<void> {
    const p = await this.findById(id);
    await this.repo.softRemove(p);
  }

  private async assertSkuFree(em: EntityManager, sku: string, excludeId?: string): Promise<void> {
    const qb = em
      .createQueryBuilder(ProductOrmEntity, 'p')
      .where('p.sku = :sku', { sku })
      .andWhere('p.deleted_at IS NULL');
    if (excludeId) qb.andWhere('p.id <> :id', { id: excludeId });
    const exists = await qb.getOne();
    if (exists) throw new ConflictException(`SKU "${sku}" ya está en uso`);
  }

  private async assertBarcodeFree(
    em: EntityManager,
    barcode: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = em
      .createQueryBuilder(ProductOrmEntity, 'p')
      .where('p.barcode = :b', { b: barcode })
      .andWhere('p.deleted_at IS NULL');
    if (excludeId) qb.andWhere('p.id <> :id', { id: excludeId });
    const exists = await qb.getOne();
    if (exists) throw new ConflictException(`Código de barras "${barcode}" ya está en uso`);
  }
}
