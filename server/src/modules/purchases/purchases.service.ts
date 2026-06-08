import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { resolveSort } from '../../common/dto/pagination-sort.query';
import { fromCents, toCents } from '../../common/money';
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
import type { UpdateFiscalDataRequestDto } from './dto/update-fiscal-data.request-dto';
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
  paymentMethod: string | null;
  itbisRetenido: string;
  isrRetenido: string;
  isrRetentionType: string | null;
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

    this.assertFiscalDataValid(
      dto.supplierFiscalDocTypeCode,
      dto.supplierNcf,
      dto.supplierInvoiceDate,
      supplier,
    );
    if (dto.supplierFiscalDocTypeCode) {
      await this.assertNcfUnique(supplier.id, dto.supplierNcf!.trim());
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

      this.assertRetentionsValid(
        dto.itbisRetenido,
        dto.isrRetenido,
        dto.isrRetentionType,
        taxC,
      );

      const po = ordersRepo.create({
        branchId,
        orderNumber,
        supplierId: supplier.id,
        status: PurchaseOrderStatus.PENDING,
        expectedDate: dto.expectedDate ?? null,
        supplierInvoice: dto.supplierInvoice?.trim() || null,
        supplierFiscalDocTypeCode: dto.supplierFiscalDocTypeCode ?? null,
        supplierNcf: dto.supplierNcf?.trim().toUpperCase() || null,
        supplierInvoiceDate: dto.supplierInvoiceDate ?? null,
        paymentMethod: dto.paymentMethod ?? null,
        itbisRetenido: dto.itbisRetenido ?? '0.00',
        isrRetenido: dto.isrRetenido ?? '0.00',
        isrRetentionType: dto.isrRetentionType ?? null,
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
          // Costo recibido (no la base promedio): es el costo real de esta entrada.
          unitCost: it.unitCost,
        });

        const newReceived = addMoney(it.receivedQuantity, r.quantity);
        await itemsRepo.update({ id: it.id }, { receivedQuantity: newReceived });

        if (dto.updateProductCost !== false) {
          // COSTO PROMEDIO MÓVIL: el recibo NO sobreescribe el costo, lo mezcla.
          // Leemos el producto DESPUÉS del movimiento (el recorder lo dejó con
          // FOR UPDATE hasta el commit → lectura consistente bajo concurrencia).
          // stockAntes = stockNuevo - recibido. costoNuevo = (stockAntes*costoAntes
          // + recibido*costoRecibido) / stockNuevo. Si no había stock positivo,
          // el costo nuevo es simplemente el del recibo.
          const prod = await productsRepo.findOne({
            where: { id: it.productId },
            select: { id: true, stock: true, costPrice: true },
          });
          if (prod) {
            const newStock = parseFloat(prod.stock);
            const oldStock = newStock - recvNow;
            // Promedio móvil en CENTAVOS para no acumular error de float:
            // costoNuevo = (stockAntes×costoAntes + recibido×costoRecibido) / stockNuevo.
            const oldCostC = toCents(prod.costPrice);
            const recvCostC = toCents(it.unitCost);
            const blendedC =
              oldStock > 0 && newStock > 0
                ? Math.round((oldStock * oldCostC + recvNow * recvCostC) / newStock)
                : recvCostC;
            await productsRepo.update(
              { id: it.productId },
              { costPrice: fromCents(blendedC) },
            );
          }
        }
      }

      // 2) Recalcular status: si Σ received == Σ ordered → RECEIVED, sino PARTIAL
      const refreshed = await itemsRepo.find({ where: { purchaseOrderId: po.id } });
      // Comparación numérica en milésimas (las cantidades son NUMERIC(14,3));
      // comparar strings con === es frágil. >= cubre la recepción completa.
      const allReceived = refreshed.every(
        (i) =>
          Math.round(parseFloat(i.receivedQuantity) * 1000) >=
          Math.round(parseFloat(i.orderedQuantity) * 1000),
      );
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

  /**
   * Edita SOLO los datos fiscales (comprobante 606) de una orden existente, sin
   * tocar líneas ni totales. Permite que una compra entre al 606 sin cancelarla
   * y recrearla. Bloqueada si la orden está cancelada. Misma validación fiscal
   * que `create`. Dejar el tipo de comprobante en blanco limpia el comprobante.
   */
  async updateFiscalData(
    id: string,
    dto: UpdateFiscalDataRequestDto,
    userId: string,
    branchId: string,
  ): Promise<PurchaseOrderResponse> {
    const po = await this.orders.findOne({ where: { id }, relations: { items: true } });
    if (!po) throw new NotFoundException(`Orden ${id} no encontrada`);
    assertSameBranch(po.branchId, branchId);
    if (po.status === PurchaseOrderStatus.CANCELLED) {
      throw new ConflictException(
        'No se puede editar el comprobante de una orden cancelada',
      );
    }
    const supplier = await this.suppliers.findOne({ where: { id: po.supplierId } });

    this.assertFiscalDataValid(
      dto.supplierFiscalDocTypeCode,
      dto.supplierNcf,
      dto.supplierInvoiceDate,
      supplier,
    );

    // Sin tipo de comprobante ⇒ se limpia todo el bloque fiscal (sale del 606).
    const hasFiscal = !!dto.supplierFiscalDocTypeCode;
    if (hasFiscal) {
      this.assertRetentionsValid(
        dto.itbisRetenido,
        dto.isrRetenido,
        dto.isrRetentionType,
        toCents(po.taxTotal),
      );
      await this.assertNcfUnique(po.supplierId, dto.supplierNcf!.trim(), po.id);
    }
    await this.orders.update(
      { id: po.id },
      {
        supplierFiscalDocTypeCode: hasFiscal ? dto.supplierFiscalDocTypeCode! : null,
        supplierNcf: hasFiscal ? dto.supplierNcf?.trim().toUpperCase() || null : null,
        supplierInvoiceDate: hasFiscal ? dto.supplierInvoiceDate ?? null : null,
        // paymentMethod no es parte del comprobante: si no viene en el patch se
        // conserva el actual (evita borrarlo al limpiar el bloque fiscal).
        paymentMethod: dto.paymentMethod ?? po.paymentMethod,
        itbisRetenido: hasFiscal ? dto.itbisRetenido ?? '0.00' : '0.00',
        isrRetenido: hasFiscal ? dto.isrRetenido ?? '0.00' : '0.00',
        isrRetentionType: hasFiscal ? dto.isrRetentionType ?? null : null,
      },
    );
    const refreshed = await this.orders.findOne({
      where: { id: po.id },
      relations: { items: true },
    });

    void this.audit.record({
      actorUserId: userId,
      action: 'purchases.update-fiscal',
      entityType: 'purchase_order',
      entityId: po.id,
      payload: {
        orderNumber: po.orderNumber,
        supplierFiscalDocTypeCode: hasFiscal ? dto.supplierFiscalDocTypeCode : null,
        supplierNcf: hasFiscal ? dto.supplierNcf ?? null : null,
        supplierInvoiceDate: hasFiscal ? dto.supplierInvoiceDate ?? null : null,
      },
    });

    return toResponse(refreshed!, supplier?.tradeName ?? '?');
  }

  /**
   * Coherencia de retenciones (606): el ITBIS retenido no puede exceder el ITBIS
   * facturado, y si hay ISR retenido debe indicarse el tipo de retención (01-08).
   */
  private assertRetentionsValid(
    itbisRetenido: string | undefined,
    isrRetenido: string | undefined,
    isrRetentionType: string | undefined,
    taxTotalCents: number,
  ): void {
    if (toCents(itbisRetenido ?? '0') > taxTotalCents) {
      throw new BadRequestException(
        `El ITBIS retenido (${itbisRetenido}) no puede exceder el ITBIS facturado (${fromCents(taxTotalCents)}).`,
      );
    }
    if (toCents(isrRetenido ?? '0') > 0 && !isrRetentionType) {
      throw new BadRequestException(
        'Indica el tipo de retención de ISR cuando registras un monto de ISR retenido.',
      );
    }
  }

  /**
   * Reglas fiscales compartidas (create + updateFiscalData): si hay tipo de
   * comprobante, NCF y fecha son obligatorios; y B01/B14/E31 exigen RNC del
   * proveedor para que el 606 sea válido.
   */
  private assertFiscalDataValid(
    docTypeCode: string | undefined,
    ncf: string | undefined,
    invoiceDate: string | undefined,
    supplier: { rnc: string | null } | null,
  ): void {
    if (!docTypeCode) return;
    if (!ncf?.trim()) {
      throw new BadRequestException(
        'El NCF del proveedor es obligatorio cuando indicas un tipo de comprobante.',
      );
    }
    if (!invoiceDate) {
      throw new BadRequestException(
        'La fecha del comprobante es obligatoria cuando indicas un tipo de comprobante.',
      );
    }
    // Formato del NCF según el tipo: B + 10 dígitos (NCF físico, 11 caracteres) o
    // E + 12 dígitos (e-CF, 13 caracteres), y debe empezar con el código del tipo
    // seleccionado (B01, E41, ...) para que sea coherente con el 606.
    const ncfVal = ncf.trim().toUpperCase();
    const isECf = docTypeCode.startsWith('E');
    const ncfFormat = isECf ? /^E\d{12}$/ : /^B\d{10}$/;
    if (!ncfFormat.test(ncfVal) || !ncfVal.startsWith(docTypeCode)) {
      throw new BadRequestException(
        isECf
          ? `NCF inválido para ${docTypeCode}: debe ser ${docTypeCode} + 10 dígitos (e-CF de 13 caracteres).`
          : `NCF inválido para ${docTypeCode}: debe ser ${docTypeCode} + 8 dígitos (NCF de 11 caracteres).`,
      );
    }
    const requiresSupplierRnc =
      docTypeCode === 'B01' || docTypeCode === 'B14' || docTypeCode === 'E31';
    if (requiresSupplierRnc && !supplier?.rnc) {
      throw new BadRequestException(
        `Tipo ${docTypeCode} requiere RNC del proveedor. Asigna el RNC en la ficha del proveedor antes.`,
      );
    }
  }

  /**
   * El NCF de un proveedor no se repite: un mismo proveedor no puede tener dos
   * compras (no canceladas) con el mismo NCF. Evita duplicar una factura en el
   * 606. `excludeOrderId` se pasa al editar para no chocar consigo misma.
   */
  private async assertNcfUnique(
    supplierId: string,
    ncf: string,
    excludeOrderId?: string,
  ): Promise<void> {
    // El NCF se guarda normalizado en mayúsculas (create/updateFiscalData), así
    // que comparamos contra el valor normalizado con el API tipado de TypeORM
    // (SQL parametrizado seguro — sin SQL crudo que pueda romper).
    const normalized = ncf.trim().toUpperCase();
    const existing = await this.orders.findOne({
      where: {
        supplierId,
        supplierNcf: normalized,
        status: Not(PurchaseOrderStatus.CANCELLED),
        ...(excludeOrderId ? { id: Not(excludeOrderId) } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(
        `El NCF ${normalized} ya está registrado para este proveedor en la orden ${existing.orderNumber}.`,
      );
    }
  }

  private async loadSupplierNames(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.suppliers.find({ where: { id: In(ids) } });
    return new Map(rows.map((s) => [s.id, s.tradeName]));
  }
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
    paymentMethod: po.paymentMethod,
    itbisRetenido: po.itbisRetenido,
    isrRetenido: po.isrRetenido,
    isrRetentionType: po.isrRetentionType,
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
