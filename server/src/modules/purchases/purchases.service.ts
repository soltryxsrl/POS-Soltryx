import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { resolveSort } from '../../common/dto/pagination-sort.query';
import {
  applyBranchFilter,
  assertSameBranch,
} from '../../common/branch/branch-scope.util';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
} from '../../common/persistence/unit-of-work.port';
import { AuditService } from '../audit/audit.service';
import { StockMovementType } from '../inventory/domain/entities/stock-movement-type';
import {
  STOCK_MOVEMENT_RECORDER,
  type StockMovementRecorder,
} from '../inventory/domain/ports/stock-movement-recorder.port';
import { ProductOrmEntity } from '../products/product.orm-entity';
import { SupplierOrmEntity } from '../suppliers/supplier.orm-entity';
import type { CancelPurchaseOrderRequestDto } from './dto/cancel-purchase-order.request-dto';
import type { CreatePurchaseOrderRequestDto } from './dto/create-purchase-order.request-dto';
import type { ListPurchaseOrdersQuery } from './dto/list-purchase-orders.query';
import type { ReceivePurchaseOrderRequestDto } from './dto/receive-purchase-order.request-dto';
import { PurchaseOrderItemOrmEntity } from './purchase-order-item.orm-entity';
import {
  PurchaseOrderOrmEntity,
  PurchaseOrderStatus,
} from './purchase-order.orm-entity';

export interface PurchaseOrderItemResponse {
  id: string;
  productId: string;
  productNameSnapshot: string;
  productSkuSnapshot: string;
  orderedQuantity: string;
  receivedQuantity: string;
  unitCost: string;
  taxRate: string;
  taxTotal: string;
  total: string;
}

export interface PurchaseOrderResponse {
  id: string;
  branchId: string | null;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  expectedDate: string | null;
  supplierInvoice: string | null;
  supplierFiscalDocTypeCode: string | null;
  supplierNcf: string | null;
  supplierInvoiceDate: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  notes: string | null;
  createdById: string;
  receivedAt: string | null;
  receivedById: string | null;
  cancelledAt: string | null;
  cancelledById: string | null;
  cancelReason: string | null;
  items: PurchaseOrderItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrdersListResponse {
  items: PurchaseOrderResponse[];
  total: number;
}

@Injectable()
export class PurchasesService {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(STOCK_MOVEMENT_RECORDER) private readonly stock: StockMovementRecorder,
    @InjectRepository(PurchaseOrderOrmEntity)
    private readonly orders: Repository<PurchaseOrderOrmEntity>,
    @InjectRepository(PurchaseOrderItemOrmEntity)
    private readonly itemsRepo: Repository<PurchaseOrderItemOrmEntity>,
    @InjectRepository(SupplierOrmEntity)
    private readonly suppliers: Repository<SupplierOrmEntity>,
    @InjectRepository(ProductOrmEntity)
    private readonly products: Repository<ProductOrmEntity>,
    private readonly audit: AuditService,
  ) {}

  async list(q: ListPurchaseOrdersQuery, branchId: string): Promise<PurchaseOrdersListResponse> {
    const limit = q.limit ?? 50;
    const offset = q.offset ?? 0;
    const sort = resolveSort(
      q.sort,
      q.sortDir,
      ['createdAt', 'orderNumber', 'total', 'expectedDate'] as const,
      { column: 'createdAt', dir: 'desc' },
    );
    const sortColumnMap = {
      createdAt: 'po.createdAt',
      orderNumber: 'po.orderNumber',
      total: 'po.total',
      expectedDate: 'po.expectedDate',
    } as const;
    const qb = this.orders
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.items', 'i')
      .orderBy(sortColumnMap[sort.column], sort.dir.toUpperCase() as 'ASC' | 'DESC')
      .skip(offset)
      .take(limit);
    applyBranchFilter(qb, 'po', branchId);
    if (q.q) {
      qb.andWhere('LOWER(po.orderNumber) LIKE :term', {
        term: `%${q.q.toLowerCase()}%`,
      });
    }
    if (q.supplierId) qb.andWhere('po.supplierId = :sid', { sid: q.supplierId });
    if (q.status) qb.andWhere('po.status = :st', { st: q.status });
    if (q.from) qb.andWhere('po.createdAt >= :from', { from: new Date(q.from) });
    if (q.to) qb.andWhere('po.createdAt <= :to', { to: new Date(q.to) });
    const [rows, total] = await qb.getManyAndCount();
    const supplierIds = [...new Set(rows.map((r) => r.supplierId))];
    const supplierMap = await this.loadSupplierNames(supplierIds);
    return {
      items: rows.map((r) => toResponse(r, supplierMap.get(r.supplierId) ?? '?')),
      total,
    };
  }

  async findById(id: string, branchId: string): Promise<PurchaseOrderResponse> {
    const row = await this.orders.findOne({ where: { id }, relations: { items: true } });
    if (!row) throw new NotFoundException(`Orden de compra ${id} no encontrada`);
    assertSameBranch(row.branchId, branchId);
    const supplierMap = await this.loadSupplierNames([row.supplierId]);
    return toResponse(row, supplierMap.get(row.supplierId) ?? '?');
  }

  async create(
    dto: CreatePurchaseOrderRequestDto,
    createdById: string,
    branchId: string,
  ): Promise<PurchaseOrderResponse> {
    const supplier = await this.suppliers.findOne({ where: { id: dto.supplierId } });
    if (!supplier) throw new NotFoundException(`Proveedor ${dto.supplierId} no encontrado`);
    assertSameBranch(supplier.branchId, branchId);
    if (!supplier.isActive) {
      throw new ConflictException(`Proveedor ${supplier.tradeName} está inactivo`);
    }

    // Validación fiscal: si viene tipo de comprobante, los otros 2 fields
    // son obligatorios (NCF + fecha del comprobante). Y si el tipo es B01/B14
    // (crédito fiscal / régimen especial) el proveedor DEBE tener RNC para
    // que el 606 sea válido.
    if (dto.supplierFiscalDocTypeCode) {
      if (!dto.supplierNcf?.trim()) {
        throw new BadRequestException(
          'supplierNcf es obligatorio cuando se indica tipo de comprobante',
        );
      }
      if (!dto.supplierInvoiceDate) {
        throw new BadRequestException(
          'supplierInvoiceDate es obligatorio cuando se indica tipo de comprobante',
        );
      }
      const requiresSupplierRnc =
        dto.supplierFiscalDocTypeCode === 'B01' ||
        dto.supplierFiscalDocTypeCode === 'B14' ||
        dto.supplierFiscalDocTypeCode === 'E31';
      if (requiresSupplierRnc && !supplier.rnc) {
        throw new BadRequestException(
          `Tipo ${dto.supplierFiscalDocTypeCode} requiere RNC del proveedor. Asigna el RNC en la ficha del proveedor antes.`,
        );
      }
    }

    // Cargar productos snapshot (nombre/sku/tax) + validar que existan
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.products.find({ where: { id: In(productIds) } });
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of dto.items) {
      const p = productMap.get(item.productId);
      if (!p) throw new NotFoundException(`Producto ${item.productId} no encontrado`);
      if (p.deletedAt) {
        throw new ConflictException(`Producto ${p.name} fue eliminado`);
      }
    }

    return this.uow.run(async (ctx) => {
      const ordersRepo = ctx.manager.getRepository(PurchaseOrderOrmEntity);
      const itemsRepo = ctx.manager.getRepository(PurchaseOrderItemOrmEntity);

      // Genera order_number consumiendo la sequence (concurrent-safe)
      const seqRows = await ctx.manager.query<{ nextval: string }[]>(
        `SELECT nextval('purchase_order_seq') AS nextval`,
      );
      const seq = parseInt(seqRows[0]?.nextval ?? '0', 10);
      const orderNumber = `PO-${seq.toString().padStart(6, '0')}`;

      let subtotalC = 0;
      let taxC = 0;
      const itemEntities: PurchaseOrderItemOrmEntity[] = [];
      for (const it of dto.items) {
        const p = productMap.get(it.productId)!;
        const qty = parseFloat(it.orderedQuantity);
        if (qty <= 0) {
          throw new BadRequestException(
            `Cantidad para ${p.name} debe ser mayor que cero`,
          );
        }
        const unitCostC = toCents(it.unitCost);
        const lineSubC = Math.round(unitCostC * qty);
        const taxRate = it.taxRate ?? p.taxRate ?? '0';
        const taxBp = Math.round(parseFloat(taxRate) * 100);
        const lineTaxC = Math.round((lineSubC * taxBp) / (100 * 100));
        const lineTotalC = lineSubC + lineTaxC;
        subtotalC += lineSubC;
        taxC += lineTaxC;

        itemEntities.push(
          itemsRepo.create({
            productId: p.id,
            productNameSnapshot: p.name,
            productSkuSnapshot: p.sku,
            orderedQuantity: it.orderedQuantity,
            receivedQuantity: '0',
            unitCost: it.unitCost,
            taxRate,
            taxTotal: fromCents(lineTaxC),
            total: fromCents(lineTotalC),
          }),
        );
      }

      const po = ordersRepo.create({
        branchId,
        orderNumber,
        supplierId: supplier.id,
        status: PurchaseOrderStatus.PENDING,
        expectedDate: dto.expectedDate ?? null,
        supplierInvoice: dto.supplierInvoice?.trim() || null,
        supplierFiscalDocTypeCode: dto.supplierFiscalDocTypeCode ?? null,
        supplierNcf: dto.supplierNcf?.trim() || null,
        supplierInvoiceDate: dto.supplierInvoiceDate ?? null,
        subtotal: fromCents(subtotalC),
        taxTotal: fromCents(taxC),
        total: fromCents(subtotalC + taxC),
        notes: dto.notes?.trim() || null,
        createdById,
      });
      const savedPo = await ordersRepo.save(po);

      for (const it of itemEntities) it.purchaseOrderId = savedPo.id;
      const savedItems = await itemsRepo.save(itemEntities);

      return toResponse({ ...savedPo, items: savedItems }, supplier.tradeName);
    });
  }

  async receive(
    id: string,
    dto: ReceivePurchaseOrderRequestDto,
    userId: string,
    branchId: string,
  ): Promise<PurchaseOrderResponse> {
    const po = await this.orders.findOne({ where: { id }, relations: { items: true } });
    if (!po) throw new NotFoundException(`Orden ${id} no encontrada`);
    assertSameBranch(po.branchId, branchId);
    if (
      po.status !== PurchaseOrderStatus.PENDING &&
      po.status !== PurchaseOrderStatus.PARTIAL
    ) {
      throw new ConflictException(
        `No se puede recibir una orden en estado ${po.status}`,
      );
    }
    const supplier = await this.suppliers.findOne({ where: { id: po.supplierId } });

    const itemMap = new Map(po.items.map((i) => [i.id, i]));
    // Validar que todos los itemId vengan en el set de la PO
    for (const r of dto.items) {
      const it = itemMap.get(r.itemId);
      if (!it) throw new BadRequestException(`Línea ${r.itemId} no pertenece a esta orden`);
      const recvNow = parseFloat(r.quantity);
      if (recvNow < 0) throw new BadRequestException(`Cantidad recibida no puede ser negativa`);
      const alreadyReceived = parseFloat(it.receivedQuantity);
      const ordered = parseFloat(it.orderedQuantity);
      if (alreadyReceived + recvNow > ordered + 0.0001) {
        throw new BadRequestException(
          `Línea ${it.productNameSnapshot}: total recibido (${alreadyReceived + recvNow}) excede lo pedido (${ordered})`,
        );
      }
    }
    if (dto.items.every((r) => parseFloat(r.quantity) === 0)) {
      throw new BadRequestException('Debes recibir cantidad > 0 en al menos una línea');
    }

    return this.uow.run(async (ctx) => {
      const itemsRepo = ctx.manager.getRepository(PurchaseOrderItemOrmEntity);
      const ordersRepo = ctx.manager.getRepository(PurchaseOrderOrmEntity);
      const productsRepo = ctx.manager.getRepository(ProductOrmEntity);

      // 1) Stock movements + actualizar received_quantity
      for (const r of dto.items) {
        const it = itemMap.get(r.itemId)!;
        const recvNow = parseFloat(r.quantity);
        if (recvNow <= 0) continue;

        await this.stock.record(ctx, {
          productId: it.productId,
          type: StockMovementType.PURCHASE,
          quantity: r.quantity,
          reason: `Recepción orden ${po.orderNumber}`,
          userId,
          branchId: po.branchId,
        });

        const newReceived = addMoney(it.receivedQuantity, r.quantity);
        await itemsRepo.update({ id: it.id }, { receivedQuantity: newReceived });

        if (dto.updateProductCost !== false) {
          await productsRepo.update({ id: it.productId }, { costPrice: it.unitCost });
        }
      }

      // 2) Recalcular status: si Σ received == Σ ordered → RECEIVED, sino PARTIAL
      const refreshed = await itemsRepo.find({ where: { purchaseOrderId: po.id } });
      const allReceived = refreshed.every((i) => i.receivedQuantity === i.orderedQuantity);
      const newStatus = allReceived
        ? PurchaseOrderStatus.RECEIVED
        : PurchaseOrderStatus.PARTIAL;

      const patch: Partial<PurchaseOrderOrmEntity> = {
        status: newStatus,
      };
      if (allReceived) {
        patch.receivedAt = new Date();
        patch.receivedById = userId;
      }
      await ordersRepo.update({ id: po.id }, patch);

      const final = await ordersRepo.findOne({
        where: { id: po.id },
        relations: { items: true },
      });

      void this.audit.record({
        actorUserId: userId,
        action: 'purchases.receive',
        entityType: 'purchase_order',
        entityId: po.id,
        payload: {
          orderNumber: po.orderNumber,
          status: final?.status,
          itemsReceived: dto.items
            .filter((r) => parseFloat(r.quantity) > 0)
            .map((r) => ({ itemId: r.itemId, quantity: r.quantity })),
        },
      });

      return toResponse(final!, supplier?.tradeName ?? '?');
    });
  }

  async cancel(
    id: string,
    dto: CancelPurchaseOrderRequestDto,
    userId: string,
    branchId: string,
  ): Promise<PurchaseOrderResponse> {
    const po = await this.orders.findOne({ where: { id }, relations: { items: true } });
    if (!po) throw new NotFoundException(`Orden ${id} no encontrada`);
    assertSameBranch(po.branchId, branchId);
    if (po.status === PurchaseOrderStatus.CANCELLED) {
      throw new ConflictException('La orden ya está cancelada');
    }
    if (po.status === PurchaseOrderStatus.RECEIVED) {
      throw new ConflictException(
        'No se puede cancelar una orden ya recibida. Si necesitas revertir, registra un ajuste de inventario.',
      );
    }
    // PARTIAL: tiene stock ya recibido — bloqueamos para evitar incoherencia.
    if (po.status === PurchaseOrderStatus.PARTIAL) {
      throw new ConflictException(
        'No se puede cancelar una orden con recepciones parciales. Recibe el resto o ajusta inventario manualmente.',
      );
    }
    const supplier = await this.suppliers.findOne({ where: { id: po.supplierId } });
    await this.orders.update(
      { id: po.id },
      {
        status: PurchaseOrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledById: userId,
        cancelReason: dto.reason.trim(),
      },
    );
    const refreshed = await this.orders.findOne({
      where: { id: po.id },
      relations: { items: true },
    });

    void this.audit.record({
      actorUserId: userId,
      action: 'purchases.cancel',
      entityType: 'purchase_order',
      entityId: po.id,
      payload: {
        orderNumber: po.orderNumber,
        total: po.total,
        reason: dto.reason,
      },
    });

    return toResponse(refreshed!, supplier?.tradeName ?? '?');
  }

  private async loadSupplierNames(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.suppliers.find({ where: { id: In(ids) } });
    return new Map(rows.map((s) => [s.id, s.tradeName]));
  }
}

function toCents(s: string | number): number {
  return Math.round(Number(s) * 100);
}

function fromCents(c: number): string {
  const sign = c < 0 ? '-' : '';
  const abs = Math.abs(c);
  return `${sign}${Math.trunc(abs / 100)}.${(abs % 100).toString().padStart(2, '0')}`;
}

function addMoney(a: string, b: string): string {
  // a y b en formato "x.yyy" (qty hasta 3 decimales)
  const factor = 1000;
  const aM = Math.round(parseFloat(a) * factor);
  const bM = Math.round(parseFloat(b) * factor);
  const sum = aM + bM;
  const whole = Math.trunc(sum / factor);
  const frac = Math.abs(sum % factor).toString().padStart(3, '0');
  return `${whole}.${frac}`;
}

function toResponse(
  po: PurchaseOrderOrmEntity,
  supplierName: string,
): PurchaseOrderResponse {
  return {
    id: po.id,
    branchId: po.branchId,
    orderNumber: po.orderNumber,
    supplierId: po.supplierId,
    supplierName,
    status: po.status as PurchaseOrderStatus,
    expectedDate: po.expectedDate,
    supplierInvoice: po.supplierInvoice,
    supplierFiscalDocTypeCode: po.supplierFiscalDocTypeCode,
    supplierNcf: po.supplierNcf,
    supplierInvoiceDate: po.supplierInvoiceDate,
    subtotal: po.subtotal,
    taxTotal: po.taxTotal,
    total: po.total,
    notes: po.notes,
    createdById: po.createdById,
    receivedAt: po.receivedAt ? po.receivedAt.toISOString() : null,
    receivedById: po.receivedById,
    cancelledAt: po.cancelledAt ? po.cancelledAt.toISOString() : null,
    cancelledById: po.cancelledById,
    cancelReason: po.cancelReason,
    items: (po.items ?? []).map((i) => ({
      id: i.id,
      productId: i.productId,
      productNameSnapshot: i.productNameSnapshot,
      productSkuSnapshot: i.productSkuSnapshot,
      orderedQuantity: i.orderedQuantity,
      receivedQuantity: i.receivedQuantity,
      unitCost: i.unitCost,
      taxRate: i.taxRate,
      taxTotal: i.taxTotal,
      total: i.total,
    })),
    createdAt: po.createdAt.toISOString(),
    updatedAt: po.updatedAt.toISOString(),
  };
}
