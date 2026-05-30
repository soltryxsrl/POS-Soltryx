import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, IsNull, Repository } from 'typeorm';
import { resolveSort } from '../../common/dto/pagination-sort.query';
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

  async list(q: ListProductsQuery): Promise<PagedProducts> {
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
    if (q.lowStock) qb.andWhere('p.stock <= p.min_stock');
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
      if (dto.barcode) await this.assertBarcodeFreeAny(manager, dto.barcode);

      // Si se referencia un tipo de ITBIS, la tasa sale del catálogo (no del dto).
      const taxTypeCode = dto.taxTypeCode || null;
      const taxRate = taxTypeCode
        ? await this.resolveTaxRate(manager, taxTypeCode)
        : (dto.taxRate ?? '0.00');

      const product = manager.create(ProductOrmEntity, {
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

  async listBarcodes(productId: string): Promise<ProductBarcodeResponse[]> {
    await this.findById(productId); // valida que existe
    const rows = await this.barcodes.find({
      where: { productId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
    return rows.map(toBarcodeResponse);
  }

  async addBarcode(
    productId: string,
    barcode: string,
    makePrimary = false,
  ): Promise<ProductBarcodeResponse> {
    const trimmed = barcode.trim();
    if (!trimmed) throw new ConflictException('Barcode no puede estar vacío');
    await this.findById(productId);
    await this.assertBarcodeFreeAny(this.repo.manager, trimmed);

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

  async setPrimaryBarcode(productId: string, barcodeId: string): Promise<void> {
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

  async removeBarcode(productId: string, barcodeId: string): Promise<void> {
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

  async update(id: string, dto: UpdateProductDto): Promise<ProductOrmEntity> {
    const current = await this.findById(id);
    if (dto.sku && dto.sku !== current.sku) {
      await this.assertSkuFree(this.repo.manager, dto.sku, id);
    }
    if (dto.barcode && dto.barcode !== current.barcode) {
      await this.assertBarcodeFreeAny(this.repo.manager, dto.barcode, id);
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
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.isKit !== undefined) patch.isKit = dto.isKit;
    if (dto.hasVariants !== undefined) patch.hasVariants = dto.hasVariants;
    if (dto.soldByWeight !== undefined) patch.soldByWeight = dto.soldByWeight;

    Object.assign(current, patch);
    return this.repo.save(current);
  }

  // --- Variants ---

  async listVariants(productId: string): Promise<VariantResponse[]> {
    await this.findById(productId);
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
  ): Promise<VariantResponse> {
    const product = await this.findById(productId);
    if (product.isKit) {
      throw new ConflictException(
        'Un producto kit no puede tener variantes. Desactiva el flag isKit primero.',
      );
    }
    await this.assertVariantSkuFree(this.repo.manager, dto.sku);
    if (dto.barcode) {
      await this.assertVariantBarcodeFree(this.repo.manager, dto.barcode);
    }
    return this.uow.run(async ({ manager }) => {
      const variant = manager.create(ProductVariantOrmEntity, {
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
  ): Promise<VariantResponse> {
    const variant = await this.variants.findOne({
      where: { id: variantId, productId, deletedAt: IsNull() },
    });
    if (!variant) {
      throw new NotFoundException(`Variante ${variantId} no encontrada`);
    }
    if (dto.sku && dto.sku !== variant.sku) {
      await this.assertVariantSkuFree(this.repo.manager, dto.sku, variantId);
    }
    if (dto.barcode && dto.barcode !== variant.barcode) {
      await this.assertVariantBarcodeFree(this.repo.manager, dto.barcode, variantId);
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

  async deleteVariant(productId: string, variantId: string): Promise<void> {
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
    excludeId?: string,
  ): Promise<void> {
    const qb = em
      .createQueryBuilder(ProductVariantOrmEntity, 'v')
      .where('v.sku = :sku', { sku })
      .andWhere('v.deleted_at IS NULL');
    if (excludeId) qb.andWhere('v.id <> :id', { id: excludeId });
    const exists = await qb.getOne();
    if (exists) throw new ConflictException(`SKU variante "${sku}" ya está en uso`);
  }

  private async assertVariantBarcodeFree(
    em: EntityManager,
    barcode: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = em
      .createQueryBuilder(ProductVariantOrmEntity, 'v')
      .where('v.barcode = :b', { b: barcode })
      .andWhere('v.deleted_at IS NULL');
    if (excludeId) qb.andWhere('v.id <> :id', { id: excludeId });
    const exists = await qb.getOne();
    if (exists) throw new ConflictException(`Barcode "${barcode}" ya está en uso`);
  }

  // --- Kits / Combos ---

  async listKitComponents(kitProductId: string): Promise<KitComponentResponse[]> {
    await this.findById(kitProductId);
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
  ): Promise<KitComponentResponse[]> {
    const kit = await this.findById(kitProductId);
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
      const found = await this.repo.find({
        where: componentIds.map((id) => ({ id, deletedAt: IsNull() })),
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

  async softDelete(id: string): Promise<void> {
    const p = await this.findById(id);
    await this.repo.softRemove(p);
  }

  /** Devuelve la tasa (%) del tipo de ITBIS, o lanza si el código no existe. */
  private async resolveTaxRate(em: EntityManager, taxTypeCode: string): Promise<string> {
    const tt = await em.findOne(TaxTypeOrmEntity, { where: { code: taxTypeCode } });
    if (!tt) throw new NotFoundException(`Tipo de ITBIS "${taxTypeCode}" no existe`);
    return tt.rate;
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

  /**
   * Valida que `barcode` no esté en uso por NINGÚN producto (chequea ambas
   * fuentes: `products.barcode` legacy y la nueva `product_barcodes`).
   */
  private async assertBarcodeFreeAny(
    em: EntityManager,
    barcode: string,
    excludeProductId?: string,
  ): Promise<void> {
    const qb1 = em
      .createQueryBuilder(ProductOrmEntity, 'p')
      .where('p.barcode = :b', { b: barcode })
      .andWhere('p.deleted_at IS NULL');
    if (excludeProductId) qb1.andWhere('p.id <> :id', { id: excludeProductId });
    const productHit = await qb1.getOne();
    if (productHit) {
      throw new ConflictException(`Código de barras "${barcode}" ya está en uso`);
    }
    const qb2 = em
      .createQueryBuilder(ProductBarcodeOrmEntity, 'pb')
      .where('pb.barcode = :b', { b: barcode });
    if (excludeProductId) qb2.andWhere('pb.product_id <> :id', { id: excludeProductId });
    const pbHit = await qb2.getOne();
    if (pbHit) {
      throw new ConflictException(`Código de barras "${barcode}" ya está en uso`);
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
