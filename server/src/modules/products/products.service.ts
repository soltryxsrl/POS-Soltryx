import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  EntityManager,
  In,
  IsNull,
  Repository,
  UpdateQueryBuilder,
} from 'typeorm';
import { CategoryOrmEntity } from '../categories/category.orm-entity';
import { resolveSort } from '../../common/dto/pagination-sort.query';
import {
  applyBranchFilter,
  assertSameBranch,
} from '../../common/branch/branch-scope.util';
import { UNIT_OF_WORK, type UnitOfWork } from '../../common/persistence/unit-of-work.port';
import {
  STOCK_MOVEMENT_RECORDER,
  type StockMovementRecorder,
} from '../inventory/domain/ports/stock-movement-recorder.port';
import { TaxTypeOrmEntity } from '../tax-types/tax-type.orm-entity';
import { ProductBarcodeOrmEntity } from './product-barcode.orm-entity';
import { ProductKitComponentOrmEntity } from './product-kit-component.orm-entity';
import { ProductVariantOrmEntity } from './product-variant.orm-entity';
import { ProductOrmEntity } from './product.orm-entity';
import type {
  BulkPriceUpdateDto,
  BulkStockLevelsDto,
} from './dto/bulk-products.dto';
import type { CreateProductDto } from './dto/create-product.dto';
import type { CreateVariantDto } from './dto/create-variant.dto';
import type { ListProductsQuery } from './dto/list-products.query';
import type { SetKitComponentsDto } from './dto/set-kit-components.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import type { UpdateVariantDto } from './dto/update-variant.dto';

export interface PagedProducts {
  items: ProductOrmEntity[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProductBarcodeResponse {
  id: string;
  productId: string;
  barcode: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface KitComponentResponse {
  id: string;
  productId: string;
  componentProductId: string;
  componentName: string;
  componentSku: string;
  quantity: string;
}

export interface VariantResponse {
  id: string;
  productId: string;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice: string | null;
  costPrice: string | null;
  stock: string;
  minStock: string;
  isActive: boolean;
}

export interface BulkUpdateResult {
  /** Cantidad de productos afectados. */
  updated: number;
}

export interface CloneCatalogResult {
  categoriesCreated: number;
  productsCreated: number;
  variantsCreated: number;
  kitComponentsCreated: number;
  barcodesCreated: number;
  /** Códigos de barras del origen que ya existían en destino y se descartaron. */
  barcodesSkipped: number;
  /** Componentes de kit que no se pudieron remapear (componente borrado en origen). */
  kitComponentsSkipped: number;
  skipped: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductOrmEntity)
    private readonly repo: Repository<ProductOrmEntity>,
    @InjectRepository(ProductBarcodeOrmEntity)
    private readonly barcodes: Repository<ProductBarcodeOrmEntity>,
    @InjectRepository(ProductKitComponentOrmEntity)
    private readonly kitComponents: Repository<ProductKitComponentOrmEntity>,
    @InjectRepository(ProductVariantOrmEntity)
    private readonly variants: Repository<ProductVariantOrmEntity>,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    /**
     * Opcional para evitar dependencia circular si se reutiliza este service en tests
     * sin el módulo Inventory cargado.
     */
    @Optional()
    @Inject(STOCK_MOVEMENT_RECORDER)
    private readonly stockRecorder: StockMovementRecorder | null,
  ) {}

  async list(q: ListProductsQuery, branchId: string): Promise<PagedProducts> {
    const limit = q.limit ?? 50;
    const offset = q.offset ?? 0;
    const sort = resolveSort(
      q.sort,
      q.sortDir,
      ['name', 'sku', 'stock', 'salePrice', 'createdAt'] as const,
      { column: 'name', dir: 'asc' },
    );
    const sortColumnMap = {
      name: 'p.name',
      sku: 'p.sku',
      stock: 'p.stock',
      salePrice: 'p.sale_price',
      createdAt: 'p.created_at',
    } as const;
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .where('p.deleted_at IS NULL')
      .orderBy(sortColumnMap[sort.column], sort.dir.toUpperCase() as 'ASC' | 'DESC')
      .take(limit)
      .skip(offset);
    applyBranchFilter(qb, 'p', branchId);

    if (q.q) {
      const term = `%${q.q.toLowerCase()}%`;
      // Búsqueda por barcode ahora considera TODOS los códigos del producto.
      // EXISTS subquery contra product_barcodes evita duplicados al joinear.
      qb.andWhere(
        new Brackets((b) => {
          b.where('LOWER(p.name) LIKE :t', { t: term })
            .orWhere('LOWER(p.sku) LIKE :t', { t: term })
            .orWhere('LOWER(p.barcode) LIKE :t', { t: term })
            .orWhere(
              `EXISTS (SELECT 1 FROM product_barcodes pb WHERE pb.product_id = p.id AND LOWER(pb.barcode) LIKE :t)`,
              { t: term },
            );
        }),
      );
    }
    if (q.categoryId) qb.andWhere('p.category_id = :cid', { cid: q.categoryId });
    if (typeof q.isActive === 'boolean')
      qb.andWhere('p.is_active = :ia', { ia: q.isActive });
    // Umbral de alerta: punto de reorden si está definido (>0), si no el mínimo.
    if (q.lowStock)
      qb.andWhere(
        'p.stock <= (CASE WHEN p.reorder_point > 0 THEN p.reorder_point ELSE p.min_stock END)',
      );
    if (q.type === 'simple') {
      qb.andWhere('p.is_kit = false').andWhere('p.has_variants = false');
    } else if (q.type === 'kit') {
      qb.andWhere('p.is_kit = true');
    } else if (q.type === 'variant') {
      qb.andWhere('p.has_variants = true');
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, limit, offset };
  }

  async findById(id: string, branchId?: string): Promise<ProductOrmEntity> {
    const p = await this.repo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: { category: true },
    });
    if (!p) throw new NotFoundException(`Producto ${id} no encontrado`);
    if (branchId) assertSameBranch(p.branchId, branchId);
    return p;
  }

  /**
   * Crea producto y, si se provee `initialStock > 0`, registra un movimiento PURCHASE
   * — todo dentro de la misma transacción.
   */
  async create(
    dto: CreateProductDto,
    actorUserId: string,
    branchId: string,
  ): Promise<ProductOrmEntity> {
    return this.uow.run(async ({ manager }) => {
      await this.assertSkuFree(manager, dto.sku, branchId);
      if (dto.barcode) await this.assertBarcodeFreeAny(manager, dto.barcode, branchId);

      // Si se referencia un tipo de ITBIS, la tasa sale del catálogo (no del dto).
      const taxTypeCode = dto.taxTypeCode || null;
      const taxRate = taxTypeCode
        ? await this.resolveTaxRate(manager, taxTypeCode)
        : (dto.taxRate ?? '0.00');

      const product = manager.create(ProductOrmEntity, {
        branchId,
        name: dto.name,
        sku: dto.sku,
        barcode: dto.barcode ?? null,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        categoryId: dto.categoryId ?? null,
        costPrice: dto.costPrice ?? '0.00',
        salePrice: dto.salePrice,
        taxRate,
        taxTypeCode,
        minStock: dto.minStock ?? '0.000',
        maxStock: dto.maxStock ?? '0.000',
        reorderPoint: dto.reorderPoint ?? '0.000',
        stock: '0.000',
        isActive: dto.isActive ?? true,
        isKit: dto.isKit ?? false,
        soldByWeight: dto.soldByWeight ?? false,
      });
      const saved = await manager.save(ProductOrmEntity, product);

      // Si vino un barcode en el dto, también lo registramos en product_barcodes
      // como primary. Así la búsqueda por barcode lo encuentra desde el día 1.
      if (dto.barcode) {
        await manager.insert(ProductBarcodeOrmEntity, {
          branchId,
          productId: saved.id,
          barcode: dto.barcode,
          isPrimary: true,
        });
      }

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

  // --- Barcodes (múltiples por producto) ---

  async listBarcodes(productId: string, branchId: string): Promise<ProductBarcodeResponse[]> {
    await this.findById(productId, branchId); // valida que existe + pertenece a la sucursal
    const rows = await this.barcodes.find({
      where: { productId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
    return rows.map(toBarcodeResponse);
  }

  async addBarcode(
    productId: string,
    barcode: string,
    makePrimary: boolean,
    branchId: string,
  ): Promise<ProductBarcodeResponse> {
    const trimmed = barcode.trim();
    if (!trimmed) throw new ConflictException('Barcode no puede estar vacío');
    await this.findById(productId, branchId);
    await this.assertBarcodeFreeAny(this.repo.manager, trimmed, branchId);

    return this.uow.run(async ({ manager }) => {
      // Si va a ser primary, primero quitamos cualquier otro primary del producto.
      if (makePrimary) {
        await manager
          .createQueryBuilder()
          .update(ProductBarcodeOrmEntity)
          .set({ isPrimary: false })
          .where('product_id = :pid AND is_primary = true', { pid: productId })
          .execute();
        await manager.update(ProductOrmEntity, { id: productId }, { barcode: trimmed });
      }
      const saved = await manager.save(
        manager.create(ProductBarcodeOrmEntity, {
          branchId,
          productId,
          barcode: trimmed,
          isPrimary: makePrimary,
        }),
      );

      // Si no hay primary y este es el primer barcode, lo dejamos como primary
      // de paso (con sync a products.barcode).
      const anyPrimary = await manager.findOne(ProductBarcodeOrmEntity, {
        where: { productId, isPrimary: true },
      });
      if (!anyPrimary) {
        await manager.update(
          ProductBarcodeOrmEntity,
          { id: saved.id },
          { isPrimary: true },
        );
        await manager.update(ProductOrmEntity, { id: productId }, { barcode: trimmed });
        return toBarcodeResponse({ ...saved, isPrimary: true });
      }
      return toBarcodeResponse(saved);
    });
  }

  async setPrimaryBarcode(productId: string, barcodeId: string, branchId: string): Promise<void> {
    await this.findById(productId, branchId);
    const bc = await this.barcodes.findOne({ where: { id: barcodeId, productId } });
    if (!bc) throw new NotFoundException(`Barcode ${barcodeId} no pertenece al producto`);

    await this.uow.run(async ({ manager }) => {
      await manager
        .createQueryBuilder()
        .update(ProductBarcodeOrmEntity)
        .set({ isPrimary: false })
        .where('product_id = :pid', { pid: productId })
        .execute();
      await manager.update(ProductBarcodeOrmEntity, { id: barcodeId }, { isPrimary: true });
      await manager.update(ProductOrmEntity, { id: productId }, { barcode: bc.barcode });
    });
  }

  async removeBarcode(productId: string, barcodeId: string, branchId: string): Promise<void> {
    await this.findById(productId, branchId);
    const bc = await this.barcodes.findOne({ where: { id: barcodeId, productId } });
    if (!bc) throw new NotFoundException(`Barcode ${barcodeId} no pertenece al producto`);

    await this.uow.run(async ({ manager }) => {
      await manager.delete(ProductBarcodeOrmEntity, { id: barcodeId });
      // Si el borrado dejó al producto sin primary, elegir el siguiente disponible
      if (bc.isPrimary) {
        const next = await manager.findOne(ProductBarcodeOrmEntity, {
          where: { productId },
          order: { createdAt: 'ASC' },
        });
        if (next) {
          await manager.update(ProductBarcodeOrmEntity, { id: next.id }, { isPrimary: true });
          await manager.update(ProductOrmEntity, { id: productId }, { barcode: next.barcode });
        } else {
          await manager.update(ProductOrmEntity, { id: productId }, { barcode: null });
        }
      }
    });
  }

  async update(id: string, dto: UpdateProductDto, branchId: string): Promise<ProductOrmEntity> {
    const current = await this.findById(id, branchId);
    if (dto.sku && dto.sku !== current.sku) {
      await this.assertSkuFree(this.repo.manager, dto.sku, branchId, id);
    }
    if (dto.barcode && dto.barcode !== current.barcode) {
      await this.assertBarcodeFreeAny(this.repo.manager, dto.barcode, branchId, id);
    }

    // Aplicamos solo campos permitidos — stock NO se toca aquí.
    const patch: Partial<ProductOrmEntity> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.sku !== undefined) patch.sku = dto.sku;
    if (dto.barcode !== undefined) patch.barcode = dto.barcode;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.imageUrl !== undefined) patch.imageUrl = dto.imageUrl;
    if (dto.categoryId !== undefined) patch.categoryId = dto.categoryId;
    if (dto.costPrice !== undefined) patch.costPrice = dto.costPrice;
    if (dto.salePrice !== undefined) patch.salePrice = dto.salePrice;
    if (dto.taxTypeCode !== undefined) {
      patch.taxTypeCode = dto.taxTypeCode || null;
      patch.taxRate = dto.taxTypeCode
        ? await this.resolveTaxRate(this.repo.manager, dto.taxTypeCode)
        : (dto.taxRate ?? current.taxRate);
    } else if (dto.taxRate !== undefined) {
      patch.taxRate = dto.taxRate;
    }
    if (dto.minStock !== undefined) patch.minStock = dto.minStock;
    if (dto.maxStock !== undefined) patch.maxStock = dto.maxStock;
    if (dto.reorderPoint !== undefined) patch.reorderPoint = dto.reorderPoint;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.isKit !== undefined) patch.isKit = dto.isKit;
    if (dto.hasVariants !== undefined) patch.hasVariants = dto.hasVariants;
    if (dto.soldByWeight !== undefined) patch.soldByWeight = dto.soldByWeight;

    Object.assign(current, patch);
    return this.repo.save(current);
  }

  // --- Actualización masiva ---

  /**
   * Aplica un WHERE de alcance (sucursal + scope) a un UPDATE query builder.
   * 'all' = toda la sucursal · 'category' = una categoría · 'ids' = lista.
   * Siempre acotado a la sucursal activa y a productos no borrados.
   */
  private applyBulkScope(
    qb: UpdateQueryBuilder<ProductOrmEntity>,
    target: { scope: 'all' | 'category' | 'ids'; categoryId?: string; productIds?: string[] },
    branchId: string,
  ): void {
    qb.where('branch_id = :branchId', { branchId }).andWhere('deleted_at IS NULL');
    if (target.scope === 'category') {
      qb.andWhere('category_id = :catId', { catId: target.categoryId });
    } else if (target.scope === 'ids') {
      qb.andWhere('id IN (:...ids)', { ids: target.productIds });
    }
  }

  /**
   * Cambio masivo de precio (venta o costo) por sucursal. Modos: fijar un valor,
   * o subir/bajar por porcentaje o monto. El resultado se redondea a 2 decimales
   * y nunca baja de 0. Las variantes conservan su propio precio (no se tocan).
   */
  async bulkUpdatePrices(
    dto: BulkPriceUpdateDto,
    branchId: string,
  ): Promise<BulkUpdateResult> {
    const num = Number(dto.value);
    if (!Number.isFinite(num)) {
      throw new BadRequestException('value inválido');
    }
    // `num` proviene de un string validado por @Matches(MONEY) → es un decimal
    // limpio, sin riesgo de inyección al interpolarlo como literal numérico.
    const col = dto.field === 'costPrice' ? 'cost_price' : 'sale_price';
    let expr: string;
    switch (dto.mode) {
      case 'set':
        expr = `${num}`;
        break;
      case 'increasePct':
        expr = `ROUND(${col} * (1 + ${num} / 100.0), 2)`;
        break;
      case 'decreasePct':
        expr = `GREATEST(0, ROUND(${col} * (1 - ${num} / 100.0), 2))`;
        break;
      case 'increaseAmount':
        expr = `ROUND(${col} + ${num}, 2)`;
        break;
      case 'decreaseAmount':
        expr = `GREATEST(0, ROUND(${col} - ${num}, 2))`;
        break;
    }
    const qb = this.repo.createQueryBuilder().update(ProductOrmEntity);
    qb.set({ [dto.field]: () => expr } as Parameters<typeof qb.set>[0]);
    this.applyBulkScope(qb, dto, branchId);
    const res = await qb.execute();
    return { updated: res.affected ?? 0 };
  }

  /**
   * Cambio masivo de niveles de stock (mínimo / máximo / punto de reorden) por
   * sucursal. Solo escribe los campos provistos. No mueve stock.
   */
  async bulkUpdateStockLevels(
    dto: BulkStockLevelsDto,
    branchId: string,
  ): Promise<BulkUpdateResult> {
    const patch: Partial<ProductOrmEntity> = {};
    if (dto.minStock !== undefined) patch.minStock = dto.minStock;
    if (dto.maxStock !== undefined) patch.maxStock = dto.maxStock;
    if (dto.reorderPoint !== undefined) patch.reorderPoint = dto.reorderPoint;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException(
        'Indica al menos uno: minStock, maxStock o reorderPoint',
      );
    }
    const qb = this.repo.createQueryBuilder().update(ProductOrmEntity).set(patch);
    this.applyBulkScope(qb, dto, branchId);
    const res = await qb.execute();
    return { updated: res.affected ?? 0 };
  }

  // --- Variants ---

  async listVariants(productId: string, branchId: string): Promise<VariantResponse[]> {
    await this.findById(productId, branchId);
    const rows = await this.variants.find({
      where: { productId, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    return rows.map(toVariantResponse);
  }

  async createVariant(
    productId: string,
    dto: CreateVariantDto,
    actorUserId: string,
    branchId: string,
  ): Promise<VariantResponse> {
    const product = await this.findById(productId, branchId);
    if (product.isKit) {
      throw new ConflictException(
        'Un producto kit no puede tener variantes. Desactiva el flag isKit primero.',
      );
    }
    await this.assertVariantSkuFree(this.repo.manager, dto.sku, branchId);
    if (dto.barcode) {
      await this.assertVariantBarcodeFree(this.repo.manager, dto.barcode, branchId);
    }
    return this.uow.run(async ({ manager }) => {
      const variant = manager.create(ProductVariantOrmEntity, {
        branchId,
        productId,
        name: dto.name,
        sku: dto.sku,
        barcode: dto.barcode ?? null,
        salePrice: dto.salePrice ?? null,
        costPrice: dto.costPrice ?? null,
        stock: '0.000',
        minStock: dto.minStock ?? '0.000',
        isActive: dto.isActive ?? true,
      });
      const saved = await manager.save(ProductVariantOrmEntity, variant);
      // Flag has_variants en el padre la primera vez
      if (!product.hasVariants) {
        await manager.update(
          ProductOrmEntity,
          { id: productId },
          { hasVariants: true },
        );
      }
      if (dto.initialStock && Number(dto.initialStock) > 0 && this.stockRecorder) {
        await this.stockRecorder.record(
          { manager },
          {
            productId,
            variantId: saved.id,
            type: 'PURCHASE',
            quantity: dto.initialStock,
            reason: `Stock inicial variante ${saved.sku}`,
            userId: actorUserId,
          },
        );
        const refreshed = await manager.findOne(ProductVariantOrmEntity, {
          where: { id: saved.id },
        });
        if (refreshed) return toVariantResponse(refreshed);
      }
      return toVariantResponse(saved);
    });
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
    branchId: string,
  ): Promise<VariantResponse> {
    await this.findById(productId, branchId);
    const variant = await this.variants.findOne({
      where: { id: variantId, productId, deletedAt: IsNull() },
    });
    if (!variant) {
      throw new NotFoundException(`Variante ${variantId} no encontrada`);
    }
    if (dto.sku && dto.sku !== variant.sku) {
      await this.assertVariantSkuFree(this.repo.manager, dto.sku, branchId, variantId);
    }
    if (dto.barcode && dto.barcode !== variant.barcode) {
      await this.assertVariantBarcodeFree(this.repo.manager, dto.barcode, branchId, variantId);
    }
    const patch: Partial<ProductVariantOrmEntity> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.sku !== undefined) patch.sku = dto.sku;
    if (dto.barcode !== undefined) patch.barcode = dto.barcode;
    if (dto.salePrice !== undefined) patch.salePrice = dto.salePrice;
    if (dto.costPrice !== undefined) patch.costPrice = dto.costPrice;
    if (dto.minStock !== undefined) patch.minStock = dto.minStock;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    Object.assign(variant, patch);
    const saved = await this.variants.save(variant);
    return toVariantResponse(saved);
  }

  async deleteVariant(productId: string, variantId: string, branchId: string): Promise<void> {
    await this.findById(productId, branchId);
    const variant = await this.variants.findOne({
      where: { id: variantId, productId, deletedAt: IsNull() },
    });
    if (!variant) {
      throw new NotFoundException(`Variante ${variantId} no encontrada`);
    }
    await this.variants.softRemove(variant);
    // Si el producto se queda sin variantes activas, apagamos hasVariants.
    const remaining = await this.variants.count({
      where: { productId, deletedAt: IsNull() },
    });
    if (remaining === 0) {
      await this.repo.update({ id: productId }, { hasVariants: false });
    }
  }

  private async assertVariantSkuFree(
    em: EntityManager,
    sku: string,
    branchId: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = em
      .createQueryBuilder(ProductVariantOrmEntity, 'v')
      .where('v.sku = :sku', { sku })
      .andWhere('v.branch_id = :branchId', { branchId })
      .andWhere('v.deleted_at IS NULL');
    if (excludeId) qb.andWhere('v.id <> :id', { id: excludeId });
    const exists = await qb.getOne();
    if (exists)
      throw new ConflictException(`SKU variante "${sku}" ya está en uso en esta sucursal`);
  }

  private async assertVariantBarcodeFree(
    em: EntityManager,
    barcode: string,
    branchId: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = em
      .createQueryBuilder(ProductVariantOrmEntity, 'v')
      .where('v.barcode = :b', { b: barcode })
      .andWhere('v.branch_id = :branchId', { branchId })
      .andWhere('v.deleted_at IS NULL');
    if (excludeId) qb.andWhere('v.id <> :id', { id: excludeId });
    const exists = await qb.getOne();
    if (exists)
      throw new ConflictException(`Barcode "${barcode}" ya está en uso en esta sucursal`);
  }

  // --- Kits / Combos ---

  async listKitComponents(kitProductId: string, branchId: string): Promise<KitComponentResponse[]> {
    await this.findById(kitProductId, branchId);
    const rows = await this.kitComponents
      .createQueryBuilder('kc')
      .leftJoinAndSelect('kc.component', 'c')
      .where('kc.kit_product_id = :id', { id: kitProductId })
      .orderBy('c.name', 'ASC')
      .getMany();
    return rows.map((r) => ({
      id: r.id,
      productId: r.kitProductId,
      componentProductId: r.componentProductId,
      componentName: r.component?.name ?? '',
      componentSku: r.component?.sku ?? '',
      quantity: r.quantity,
    }));
  }

  /**
   * Reemplaza por completo la receta del kit. Verifica que ningún componente
   * sea a su vez un kit (no anidamos kits) y que los componentes existan.
   */
  async setKitComponents(
    kitProductId: string,
    dto: SetKitComponentsDto,
    branchId: string,
  ): Promise<KitComponentResponse[]> {
    const kit = await this.findById(kitProductId, branchId);
    if (!kit.isKit) {
      throw new ConflictException(
        'El producto no está marcado como kit. Actívalo primero.',
      );
    }
    const componentIds = dto.components.map((c) => c.productId);
    if (new Set(componentIds).size !== componentIds.length) {
      throw new ConflictException('Hay componentes duplicados en la receta.');
    }
    if (componentIds.includes(kitProductId)) {
      throw new ConflictException('El kit no puede contenerse a sí mismo.');
    }
    if (componentIds.length > 0) {
      // Los componentes deben ser de la MISMA sucursal del kit. Scopear por
      // branchId evita armar recetas cross-sucursal (que al vender drenarían
      // stock de otra sucursal). Un componente de otra sucursal cae en `missing`.
      const found = await this.repo.find({
        where: componentIds.map((id) => ({ id, branchId, deletedAt: IsNull() })),
      });
      const foundIds = new Set(found.map((p) => p.id));
      const missing = componentIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        throw new NotFoundException(
          `Componentes no encontrados: ${missing.join(', ')}`,
        );
      }
      const nested = found.find((p) => p.isKit);
      if (nested) {
        throw new ConflictException(
          `"${nested.name}" es un kit; no se pueden anidar kits.`,
        );
      }
    }
    return this.uow.run(async ({ manager }) => {
      await manager.delete(ProductKitComponentOrmEntity, {
        kitProductId,
      });
      if (dto.components.length > 0) {
        await manager.insert(
          ProductKitComponentOrmEntity,
          dto.components.map((c) => ({
            kitProductId,
            componentProductId: c.productId,
            quantity: c.quantity,
          })),
        );
      }
      const rows = await manager.find(ProductKitComponentOrmEntity, {
        where: { kitProductId },
        relations: { component: true },
      });
      return rows.map((r) => ({
        id: r.id,
        productId: r.kitProductId,
        componentProductId: r.componentProductId,
        componentName: r.component?.name ?? '',
        componentSku: r.component?.sku ?? '',
        quantity: r.quantity,
      }));
    });
  }

  async softDelete(id: string, branchId?: string): Promise<void> {
    await this.findById(id, branchId); // valida existencia + sucursal
    await this.uow.run(async ({ manager }) => {
      // Liberar el SKU/código para reúso en la sucursal. Los índices únicos son
      // parciales (deleted_at IS NULL) o, en product_barcodes, sin deleted_at,
      // así que dejar estas filas bloquearía reutilizar el mismo código tras
      // borrar el producto. Borramos barcodes (no tienen soft-delete) y hacemos
      // soft-delete de las variantes junto con el producto.
      await manager.delete(ProductBarcodeOrmEntity, { productId: id });
      await manager.softDelete(ProductVariantOrmEntity, { productId: id });
      await manager.softDelete(ProductOrmEntity, { id });
    });
  }

  /**
   * Clona el catálogo de `sourceBranchId` a la sucursal destino:
   *   - categorías (por nombre, sin duplicar) CON su jerarquía (parentId remapeado),
   *   - productos SIMPLES, con VARIANTES y KITS (stock en 0),
   *   - variantes de cada producto, códigos de barras secundarios, y la receta
   *     de cada kit (remapeando los componentes a los productos clonados).
   * Para productos cuyo SKU YA existe en destino hace "top-up": agrega las
   * variantes/códigos que falten (sin tocar ni duplicar lo existente; no voltea
   * un producto simple a con-variantes para no romper su stock). Las colisiones
   * de código de barras se resuelven dejando el código fuera (no aborta).
   */
  async cloneCatalog(
    sourceBranchId: string,
    targetBranchId: string,
  ): Promise<CloneCatalogResult> {
    if (sourceBranchId === targetBranchId) {
      throw new BadRequestException('La sucursal origen y destino no pueden ser la misma');
    }
    return this.uow.run(async ({ manager }) => {
      const result: CloneCatalogResult = {
        categoriesCreated: 0,
        productsCreated: 0,
        variantsCreated: 0,
        kitComponentsCreated: 0,
        barcodesCreated: 0,
        barcodesSkipped: 0,
        kitComponentsSkipped: 0,
        skipped: 0,
      };

      // 1) Categorías: clonar por nombre las que falten en destino.
      const srcCats = await manager.find(CategoryOrmEntity, {
        where: { branchId: sourceBranchId, deletedAt: IsNull() },
      });
      const dstCats = await manager.find(CategoryOrmEntity, {
        where: { branchId: targetBranchId, deletedAt: IsNull() },
      });
      const catMap = new Map<string, string>();
      const dstCatByName = new Map(dstCats.map((c) => [c.name.toLowerCase(), c.id]));
      const createdCats: Array<{ src: CategoryOrmEntity; dstId: string }> = [];
      for (const c of srcCats) {
        const existing = dstCatByName.get(c.name.toLowerCase());
        if (existing) {
          catMap.set(c.id, existing);
          continue;
        }
        const saved = await manager.save(
          manager.create(CategoryOrmEntity, {
            branchId: targetBranchId,
            name: c.name,
            description: c.description,
            parentId: null, // se remapea en la 2da pasada
            isActive: c.isActive,
          }),
        );
        catMap.set(c.id, saved.id);
        createdCats.push({ src: c, dstId: saved.id });
        result.categoriesCreated += 1;
      }
      // 2da pasada: remapear la jerarquía SOLO en las categorías recién creadas
      // (no tocamos el árbol de categorías preexistentes del destino).
      for (const { src, dstId } of createdCats) {
        if (!src.parentId) continue;
        const dstParent = catMap.get(src.parentId);
        if (dstParent && dstParent !== dstId) {
          await manager.update(CategoryOrmEntity, { id: dstId }, { parentId: dstParent });
        }
      }

      // 2) Estado del destino (para evitar colisiones y duplicados).
      const dstProducts = await manager.find(ProductOrmEntity, {
        where: { branchId: targetBranchId, deletedAt: IsNull() },
        select: { id: true, sku: true, barcode: true, hasVariants: true },
      });
      const dstProductBySku = new Map(dstProducts.map((p) => [p.sku, p]));
      // Namespace de barcodes del destino = products.barcode + product_barcodes.
      const usedProductBarcodes = new Set<string>();
      for (const p of dstProducts) if (p.barcode) usedProductBarcodes.add(p.barcode);
      const dstPb = await manager.find(ProductBarcodeOrmEntity, {
        where: { branchId: targetBranchId },
        select: { barcode: true },
      });
      for (const b of dstPb) usedProductBarcodes.add(b.barcode);
      // Namespace de SKU/barcode de variantes del destino.
      const dstVariants = await manager.find(ProductVariantOrmEntity, {
        where: { branchId: targetBranchId, deletedAt: IsNull() },
        select: { sku: true, barcode: true },
      });
      const usedVariantSkus = new Set(dstVariants.map((v) => v.sku));
      const usedVariantBarcodes = new Set(
        dstVariants.map((v) => v.barcode).filter((b): b is string => !!b),
      );

      // 3) Catálogo origen + sub-recursos (una query por tabla).
      const srcProducts = await manager.find(ProductOrmEntity, {
        where: { branchId: sourceBranchId, deletedAt: IsNull() },
      });
      const srcVariants = await manager.find(ProductVariantOrmEntity, {
        where: { branchId: sourceBranchId, deletedAt: IsNull() },
      });
      const srcBarcodes = await manager.find(ProductBarcodeOrmEntity, {
        where: { branchId: sourceBranchId },
        order: { isPrimary: 'DESC', createdAt: 'ASC' },
      });
      const srcKitIds = srcProducts.filter((p) => p.isKit).map((p) => p.id);
      const srcKitComps = srcKitIds.length
        ? await manager.find(ProductKitComponentOrmEntity, {
            where: { kitProductId: In(srcKitIds) },
          })
        : [];

      // Agrupar sub-recursos por producto/kit origen.
      const variantsByProduct = new Map<string, ProductVariantOrmEntity[]>();
      for (const v of srcVariants) {
        const arr = variantsByProduct.get(v.productId);
        if (arr) arr.push(v);
        else variantsByProduct.set(v.productId, [v]);
      }
      const barcodesByProduct = new Map<string, ProductBarcodeOrmEntity[]>();
      for (const b of srcBarcodes) {
        const arr = barcodesByProduct.get(b.productId);
        if (arr) arr.push(b);
        else barcodesByProduct.set(b.productId, [b]);
      }
      const compsByKit = new Map<string, ProductKitComponentOrmEntity[]>();
      for (const kc of srcKitComps) {
        const arr = compsByKit.get(kc.kitProductId);
        if (arr) arr.push(kc);
        else compsByKit.set(kc.kitProductId, [kc]);
      }

      // id producto origen -> id producto destino (recién creado o ya existente).
      const productMap = new Map<string, string>();
      const createdKits: Array<{ srcId: string; dstId: string }> = [];

      // Clona los códigos de barras del origen al producto destino. `allowPrimary`
      // marca el primer código que sobrevive como primary (solo cuando el destino
      // aún no tiene uno — un producto preexistente ya conserva su primary, y
      // marcar otro violaría uq_pb_one_primary_per_product). Devuelve el barcode
      // que quedó como primary nuevo, o null.
      const cloneBarcodesFor = async (
        src: ProductOrmEntity,
        dstProductId: string,
        allowPrimary: boolean,
      ): Promise<string | null> => {
        let srcPbs = barcodesByProduct.get(src.id) ?? [];
        if (srcPbs.length === 0 && src.barcode) {
          // Defensivo: barcode en cache sin fila en product_barcodes (legacy).
          srcPbs = [{ barcode: src.barcode, isPrimary: true } as ProductBarcodeOrmEntity];
        }
        let newPrimary: string | null = null;
        for (const pb of srcPbs) {
          if (usedProductBarcodes.has(pb.barcode)) {
            result.barcodesSkipped += 1;
            continue;
          }
          const makePrimary = allowPrimary && newPrimary === null;
          await manager.insert(ProductBarcodeOrmEntity, {
            branchId: targetBranchId,
            productId: dstProductId,
            barcode: pb.barcode,
            isPrimary: makePrimary,
          });
          usedProductBarcodes.add(pb.barcode);
          result.barcodesCreated += 1;
          if (makePrimary) newPrimary = pb.barcode;
        }
        return newPrimary;
      };

      // Clona las variantes del origen que falten en el destino (por SKU). Stock
      // en 0. Devuelve cuántas agregó.
      const cloneVariantsFor = async (
        srcProductId: string,
        dstProductId: string,
      ): Promise<number> => {
        let added = 0;
        for (const v of variantsByProduct.get(srcProductId) ?? []) {
          if (usedVariantSkus.has(v.sku)) continue;
          const vBarcode =
            v.barcode && !usedVariantBarcodes.has(v.barcode) ? v.barcode : null;
          await manager.insert(ProductVariantOrmEntity, {
            branchId: targetBranchId,
            productId: dstProductId,
            name: v.name,
            sku: v.sku,
            barcode: vBarcode,
            salePrice: v.salePrice,
            costPrice: v.costPrice,
            stock: '0.000',
            minStock: v.minStock,
            isActive: v.isActive,
          });
          usedVariantSkus.add(v.sku);
          if (vBarcode) usedVariantBarcodes.add(vBarcode);
          result.variantsCreated += 1;
          added += 1;
        }
        return added;
      };

      // Crea la fila producto (cualquier tipo) + variantes + barcodes.
      const cloneProductRow = async (p: ProductOrmEntity): Promise<string> => {
        const created = await manager.save(
          manager.create(ProductOrmEntity, {
            branchId: targetBranchId,
            name: p.name,
            sku: p.sku,
            barcode: null,
            description: p.description,
            imageUrl: p.imageUrl,
            categoryId: p.categoryId ? catMap.get(p.categoryId) ?? null : null,
            costPrice: p.costPrice,
            salePrice: p.salePrice,
            taxRate: p.taxRate,
            taxTypeCode: p.taxTypeCode,
            minStock: p.minStock,
            stock: '0.000',
            isActive: p.isActive,
            isKit: p.isKit,
            hasVariants: p.hasVariants,
            soldByWeight: p.soldByWeight,
          }),
        );
        result.productsCreated += 1;
        if (p.hasVariants) await cloneVariantsFor(p.id, created.id);
        const newPrimary = await cloneBarcodesFor(p, created.id, true);
        if (newPrimary) {
          await manager.update(ProductOrmEntity, { id: created.id }, { barcode: newPrimary });
        }
        return created.id;
      };

      // TOP-UP de un producto que YA existe en destino: agrega variantes/códigos
      // faltantes sin tocar lo existente. NO voltea un producto simple del destino
      // a con-variantes (rompería su stock); solo completa los que ya manejan
      // variantes. Los barcodes nuevos van como secundarios (el primary se respeta).
      const topUpExisting = async (
        src: ProductOrmEntity,
        existing: { id: string; barcode: string | null; hasVariants: boolean },
      ): Promise<void> => {
        if (!src.isKit && existing.hasVariants) {
          await cloneVariantsFor(src.id, existing.id);
        }
        const hasPrimary = !!existing.barcode;
        const newPrimary = await cloneBarcodesFor(src, existing.id, !hasPrimary);
        if (newPrimary) {
          await manager.update(ProductOrmEntity, { id: existing.id }, { barcode: newPrimary });
        }
      };

      // 4) Productos NO kit (simples + con variantes). Deben existir antes que
      //    las recetas de kit, porque pueden ser componentes.
      for (const p of srcProducts) {
        if (p.isKit) continue;
        const existing = dstProductBySku.get(p.sku);
        if (existing) {
          productMap.set(p.id, existing.id);
          result.skipped += 1;
          await topUpExisting(p, existing);
          continue;
        }
        const newId = await cloneProductRow(p);
        productMap.set(p.id, newId);
      }

      // 5) Productos kit (solo la fila producto). Las recetas, después.
      for (const p of srcProducts) {
        if (!p.isKit) continue;
        const existing = dstProductBySku.get(p.sku);
        if (existing) {
          productMap.set(p.id, existing.id);
          result.skipped += 1;
          await topUpExisting(p, existing);
          continue;
        }
        const newId = await cloneProductRow(p);
        productMap.set(p.id, newId);
        createdKits.push({ srcId: p.id, dstId: newId });
      }

      // 6) Recetas de los kits recién creados — remapear componentes a destino.
      for (const { srcId, dstId } of createdKits) {
        for (const kc of compsByKit.get(srcId) ?? []) {
          const dstComp = productMap.get(kc.componentProductId);
          if (dstComp === dstId) continue; // self-ref (no debería ocurrir)
          if (!dstComp) {
            // Componente no clonable (borrado en origen): no lo silenciamos.
            result.kitComponentsSkipped += 1;
            continue;
          }
          await manager.insert(ProductKitComponentOrmEntity, {
            kitProductId: dstId,
            componentProductId: dstComp,
            quantity: kc.quantity,
          });
          result.kitComponentsCreated += 1;
        }
      }

      return result;
    });
  }

  /** Devuelve la tasa (%) del tipo de ITBIS, o lanza si el código no existe. */
  private async resolveTaxRate(em: EntityManager, taxTypeCode: string): Promise<string> {
    const tt = await em.findOne(TaxTypeOrmEntity, { where: { code: taxTypeCode } });
    if (!tt) throw new NotFoundException(`Tipo de ITBIS "${taxTypeCode}" no existe`);
    return tt.rate;
  }

  private async assertSkuFree(
    em: EntityManager,
    sku: string,
    branchId: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = em
      .createQueryBuilder(ProductOrmEntity, 'p')
      .where('p.sku = :sku', { sku })
      .andWhere('p.branch_id = :branchId', { branchId })
      .andWhere('p.deleted_at IS NULL');
    if (excludeId) qb.andWhere('p.id <> :id', { id: excludeId });
    const exists = await qb.getOne();
    if (exists) throw new ConflictException(`SKU "${sku}" ya está en uso en esta sucursal`);
  }

  /**
   * Valida que `barcode` no esté en uso por NINGÚN producto (chequea ambas
   * fuentes: `products.barcode` legacy y la nueva `product_barcodes`).
   */
  private async assertBarcodeFreeAny(
    em: EntityManager,
    barcode: string,
    branchId: string,
    excludeProductId?: string,
  ): Promise<void> {
    const qb1 = em
      .createQueryBuilder(ProductOrmEntity, 'p')
      .where('p.barcode = :b', { b: barcode })
      .andWhere('p.branch_id = :branchId', { branchId })
      .andWhere('p.deleted_at IS NULL');
    if (excludeProductId) qb1.andWhere('p.id <> :id', { id: excludeProductId });
    const productHit = await qb1.getOne();
    if (productHit) {
      throw new ConflictException(`Código de barras "${barcode}" ya está en uso en esta sucursal`);
    }
    // El barcode secundario (product_barcodes) se scopea por su sucursal
    // (denormalizada), para que el mismo código pueda existir en otra sucursal.
    const qb2 = em
      .createQueryBuilder(ProductBarcodeOrmEntity, 'pb')
      .where('pb.barcode = :b', { b: barcode })
      .andWhere('pb.branch_id = :branchId', { branchId });
    if (excludeProductId) qb2.andWhere('pb.product_id <> :id', { id: excludeProductId });
    const pbHit = await qb2.getOne();
    if (pbHit) {
      throw new ConflictException(`Código de barras "${barcode}" ya está en uso en esta sucursal`);
    }
  }
}

function toBarcodeResponse(b: ProductBarcodeOrmEntity): ProductBarcodeResponse {
  return {
    id: b.id,
    productId: b.productId,
    barcode: b.barcode,
    isPrimary: b.isPrimary,
    createdAt: b.createdAt.toISOString(),
  };
}

function toVariantResponse(v: ProductVariantOrmEntity): VariantResponse {
  return {
    id: v.id,
    productId: v.productId,
    name: v.name,
    sku: v.sku,
    barcode: v.barcode,
    salePrice: v.salePrice,
    costPrice: v.costPrice,
    stock: v.stock,
    minStock: v.minStock,
    isActive: v.isActive,
  };
}
