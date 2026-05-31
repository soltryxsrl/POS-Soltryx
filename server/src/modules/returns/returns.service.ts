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
import { assertSameBranch } from '../../common/branch/branch-scope.util';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
} from '../../common/persistence/unit-of-work.port';
import { AuditService } from '../audit/audit.service';
import { CustomerAccountService } from '../customer-account/customer-account.service';
import { StockMovementType } from '../inventory/domain/entities/stock-movement-type';
import {
  STOCK_MOVEMENT_RECORDER,
  type StockMovementRecorder,
} from '../inventory/domain/ports/stock-movement-recorder.port';
import { CashSessionOrmEntity } from '../cash-sessions/infrastructure/persistence/typeorm/cash-session.orm-entity';
import { CashMovementOrmEntity } from '../cash-sessions/infrastructure/persistence/typeorm/cash-movement.orm-entity';
import { CashSessionStatus } from '../cash-sessions/domain/value-objects/cash-session-status';
import { CashMovementType } from '../cash-sessions/domain/value-objects/cash-movement-type';
import {
  PRODUCT_PRICING_PORT,
  type ProductPricingPort,
} from '../sales/domain/ports/product-pricing.port';
import { PaymentMethod } from '../sales/domain/value-objects/payment-method';
import { SaleStatus } from '../sales/domain/value-objects/sale-status';
import { SaleItemOrmEntity } from '../sales/infrastructure/persistence/typeorm/sale-item.orm-entity';
import { PaymentOrmEntity } from '../sales/infrastructure/persistence/typeorm/payment.orm-entity';
import { SaleOrmEntity } from '../sales/infrastructure/persistence/typeorm/sale.orm-entity';
import type { CreateReturnRequestDto } from './dto/create-return.request-dto';
import type { ListReturnsQuery } from './dto/list-returns.query';
import { SaleReturnItemOrmEntity } from './sale-return-item.orm-entity';
import {
  RefundMethod,
  SaleReturnOrmEntity,
} from './sale-return.orm-entity';

export interface SaleReturnItemResponse {
  id: string;
  saleItemId: string;
  productId: string;
  productNameSnapshot: string;
  productSkuSnapshot: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  taxTotal: string;
  total: string;
}

export interface SaleReturnResponse {
  id: string;
  returnNumber: string;
  saleId: string;
  saleNumber: string | null;
  cashSessionId: string;
  customerId: string | null;
  userId: string;
  refundMethod: RefundMethod;
  subtotal: string;
  taxTotal: string;
  total: string;
  reason: string | null;
  notes: string | null;
  items: SaleReturnItemResponse[];
  createdAt: string;
}

interface ReturnableSaleItem {
  saleItem: SaleItemOrmEntity;
  alreadyReturned: number;
  remaining: number;
}

@Injectable()
export class ReturnsService {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(STOCK_MOVEMENT_RECORDER) private readonly stock: StockMovementRecorder,
    @Inject(PRODUCT_PRICING_PORT) private readonly pricing: ProductPricingPort,
    @InjectRepository(SaleReturnOrmEntity)
    private readonly returns: Repository<SaleReturnOrmEntity>,
    @InjectRepository(SaleReturnItemOrmEntity)
    private readonly returnItems: Repository<SaleReturnItemOrmEntity>,
    @InjectRepository(SaleOrmEntity)
    private readonly sales: Repository<SaleOrmEntity>,
    @InjectRepository(SaleItemOrmEntity)
    private readonly saleItems: Repository<SaleItemOrmEntity>,
    @InjectRepository(PaymentOrmEntity)
    private readonly payments: Repository<PaymentOrmEntity>,
    @InjectRepository(CashSessionOrmEntity)
    private readonly cashSessions: Repository<CashSessionOrmEntity>,
    private readonly accounts: CustomerAccountService,
    private readonly audit: AuditService,
  ) {}

  async listForSale(saleId: string): Promise<SaleReturnResponse[]> {
    const rows = await this.returns.find({
      where: { saleId },
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
    const sale = await this.sales.findOne({ where: { id: saleId } });
    return rows.map((r) => toResponse(r, sale?.saleNumber ?? null));
  }

  async list(
    q: ListReturnsQuery,
    branchId: string,
  ): Promise<{ items: SaleReturnResponse[]; total: number }> {
    const limit = q.limit ?? 50;
    const offset = q.offset ?? 0;
    const sort = resolveSort(
      q.sort,
      q.sortDir,
      ['createdAt', 'returnNumber', 'total'] as const,
      { column: 'createdAt', dir: 'desc' },
    );
    const sortColumnMap = {
      createdAt: 'r.createdAt',
      returnNumber: 'r.returnNumber',
      total: 'r.total',
    } as const;

    const qb = this.returns
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.items', 'i')
      .orderBy(sortColumnMap[sort.column], sort.dir.toUpperCase() as 'ASC' | 'DESC')
      .take(limit)
      .skip(offset);

    if (q.q) {
      qb.andWhere('LOWER(r.returnNumber) LIKE :term', {
        term: `%${q.q.toLowerCase()}%`,
      });
    }
    qb.andWhere('r.branchId = :branchId', { branchId });
    if (q.saleId) qb.andWhere('r.saleId = :sid', { sid: q.saleId });
    if (q.userId) qb.andWhere('r.userId = :uid', { uid: q.userId });
    if (q.refundMethod) qb.andWhere('r.refundMethod = :rm', { rm: q.refundMethod });
    if (q.from) qb.andWhere('r.createdAt >= :from', { from: new Date(q.from) });
    if (q.to) qb.andWhere('r.createdAt <= :to', { to: new Date(q.to) });

    const [rows, total] = await qb.getManyAndCount();
    const saleIds = [...new Set(rows.map((r) => r.saleId))];
    const saleNumberById = await this.loadSaleNumbers(saleIds);
    return {
      items: rows.map((r) => toResponse(r, saleNumberById.get(r.saleId) ?? null)),
      total,
    };
  }

  private async loadSaleNumbers(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.sales
      .createQueryBuilder('s')
      .select(['s.id', 's.saleNumber'])
      .where('s.id IN (:...ids)', { ids })
      .getMany();
    return new Map(rows.map((s) => [s.id, s.saleNumber]));
  }

  async findById(id: string): Promise<SaleReturnResponse> {
    const row = await this.returns.findOne({ where: { id }, relations: { items: true } });
    if (!row) throw new NotFoundException(`Devolución ${id} no encontrada`);
    const sale = await this.sales.findOne({ where: { id: row.saleId } });
    return toResponse(row, sale?.saleNumber ?? null);
  }

  async getReturnableItems(saleId: string): Promise<ReturnableSaleItem[]> {
    const items = await this.saleItems.find({ where: { saleId } });
    if (items.length === 0) return [];
    const returnAgg = await this.returnItems
      .createQueryBuilder('ri')
      .select('ri.sale_item_id', 'saleItemId')
      .addSelect('COALESCE(SUM(ri.quantity), 0)', 'alreadyReturned')
      .where('ri.sale_item_id IN (:...ids)', { ids: items.map((i) => i.id) })
      .groupBy('ri.sale_item_id')
      .getRawMany<{ saleItemId: string; alreadyReturned: string }>();
    const map = new Map(returnAgg.map((r) => [r.saleItemId, parseFloat(r.alreadyReturned)]));
    return items.map((saleItem) => {
      const ordered = parseFloat(saleItem.quantity);
      const alreadyReturned = map.get(saleItem.id) ?? 0;
      return {
        saleItem,
        alreadyReturned,
        remaining: ordered - alreadyReturned,
      };
    });
  }

  async create(
    dto: CreateReturnRequestDto,
    userId: string,
    branchId: string,
  ): Promise<SaleReturnResponse> {
    const sale = await this.sales.findOne({ where: { id: dto.saleId } });
    if (!sale) throw new NotFoundException(`Venta ${dto.saleId} no encontrada`);
    // Anti-IDOR: solo se devuelve de ventas de la sucursal activa.
    assertSameBranch(sale.branchId, branchId);
    if (sale.status !== SaleStatus.COMPLETED) {
      throw new ConflictException(
        `Solo se puede devolver de ventas en estado COMPLETED (actual: ${sale.status})`,
      );
    }

    // Sesión de caja ABIERTA de la sucursal activa para asociar la devolución
    // (y, si el reembolso es CASH, descontarla del arqueo de ESE turno). Se
    // prefiere la sesión propia del cajero; si no tiene una abierta, la más
    // reciente de la sucursal. NO debe tomar una sesión de otra sucursal.
    const session =
      (await this.cashSessions.findOne({
        where: { status: CashSessionStatus.OPEN, branchId, openedById: userId },
        order: { openedAt: 'DESC' },
      })) ??
      (await this.cashSessions.findOne({
        where: { status: CashSessionStatus.OPEN, branchId },
        order: { openedAt: 'DESC' },
      }));
    if (!session) {
      throw new ConflictException(
        'Necesitas una sesión de caja abierta en esta sucursal para registrar devoluciones',
      );
    }

    // STORE_CREDIT / ACCOUNT requieren cliente en la venta
    if (
      (dto.refundMethod === RefundMethod.STORE_CREDIT ||
        dto.refundMethod === RefundMethod.ACCOUNT) &&
      !sale.customerId
    ) {
      throw new BadRequestException(
        `Método ${dto.refundMethod} requiere que la venta tenga cliente asignado`,
      );
    }

    // Si refund=ACCOUNT, validar que la venta tenía un pago ACCOUNT
    if (dto.refundMethod === RefundMethod.ACCOUNT) {
      const accountPay = await this.payments
        .createQueryBuilder('p')
        .where('p.sale_id = :sid AND p.method = :m', {
          sid: sale.id,
          m: PaymentMethod.ACCOUNT,
        })
        .getOne();
      if (!accountPay) {
        throw new BadRequestException(
          'Solo se puede reembolsar a la cuenta si la venta original fue fiada',
        );
      }
    }

    const returnable = await this.getReturnableItems(sale.id);
    const byItemId = new Map(returnable.map((r) => [r.saleItem.id, r]));

    // Validar líneas: pertenecen a esta venta + cantidad ≤ remaining
    for (const r of dto.items) {
      const info = byItemId.get(r.saleItemId);
      if (!info) {
        throw new BadRequestException(`Ítem ${r.saleItemId} no pertenece a la venta ${sale.saleNumber}`);
      }
      const q = parseFloat(r.quantity);
      if (q <= 0) {
        throw new BadRequestException(`Cantidad inválida para ${info.saleItem.productNameSnapshot}`);
      }
      if (q > info.remaining + 0.0001) {
        throw new BadRequestException(
          `${info.saleItem.productNameSnapshot}: solo quedan ${info.remaining.toFixed(3)} por devolver`,
        );
      }
    }

    return this.uow.run(async (ctx) => {
      const m = ctx.manager;

      // Sale_number de devolución desde sequence (concurrent-safe)
      const seqRows = await m.query<{ nextval: string }[]>(
        `SELECT nextval('sale_return_seq') AS nextval`,
      );
      const seq = parseInt(seqRows[0]?.nextval ?? '0', 10);
      const returnNumber = `RT-${seq.toString().padStart(6, '0')}`;

      // Cargamos snapshot ACTUAL de productos SOLO para líneas viejas (antes
      // de la migración 1026) que no guardaron kitComponentsSnapshot. Las
      // ventas nuevas usan la receta histórica del propio sale_item.
      const legacyProductIds = [
        ...new Set(
          dto.items
            .map((r) => byItemId.get(r.saleItemId)!.saleItem)
            .filter((it) => !it.kitComponentsSnapshot && it.productId !== null)
            .map((it) => it.productId as string),
        ),
      ];
      const legacySnaps = legacyProductIds.length
        ? await this.pricing.findManyForSale(ctx, legacyProductIds)
        : [];
      const legacySnapById = new Map(legacySnaps.map((s) => [s.id, s]));

      // Construir líneas calculadas
      let subC = 0;
      let taxC = 0;
      const lineDrafts: Array<{
        saleItemId: string;
        productId: string;
        variantId: string | null;
        kitRecipeSnapshot: Array<{ componentProductId: string; quantity: string }> | null;
        productNameSnapshot: string;
        productSkuSnapshot: string;
        quantity: string;
        unitPrice: string;
        taxRate: string;
        taxTotal: string;
        total: string;
        absLineForStock: string;
      }> = [];

      for (const r of dto.items) {
        const info = byItemId.get(r.saleItemId)!;
        const item = info.saleItem;
        if (item.productId === null) {
          throw new BadRequestException(
            `No se pueden devolver ítems de monto libre (${item.productNameSnapshot})`,
          );
        }
        const q = parseFloat(r.quantity);
        const unitC = Math.round(parseFloat(item.unitPrice) * 100);
        const lineSubC = Math.round(unitC * q);
        const taxBp = Math.round(parseFloat(item.taxRate) * 100);
        const lineTaxC = Math.round((lineSubC * taxBp) / (100 * 100));
        subC += lineSubC;
        taxC += lineTaxC;
        lineDrafts.push({
          saleItemId: item.id,
          productId: item.productId,
          variantId: item.variantId,
          kitRecipeSnapshot: item.kitComponentsSnapshot,
          productNameSnapshot: item.productNameSnapshot,
          productSkuSnapshot: item.productSkuSnapshot,
          quantity: r.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          taxTotal: fromCents(lineTaxC),
          total: fromCents(lineSubC + lineTaxC),
          absLineForStock: r.quantity,
        });
      }

      const totalC = subC + taxC;

      const sr = await m.save(
        m.create(SaleReturnOrmEntity, {
          branchId: sale.branchId,
          returnNumber,
          saleId: sale.id,
          cashSessionId: session.id,
          customerId: sale.customerId,
          userId,
          refundMethod: dto.refundMethod,
          subtotal: fromCents(subC),
          taxTotal: fromCents(taxC),
          total: fromCents(totalC),
          reason: dto.reason?.trim() || null,
          notes: dto.notes?.trim() || null,
        }),
      );

      for (const l of lineDrafts) {
        await m.save(
          m.create(SaleReturnItemOrmEntity, {
            saleReturnId: sr.id,
            saleItemId: l.saleItemId,
            productId: l.productId,
            productNameSnapshot: l.productNameSnapshot,
            productSkuSnapshot: l.productSkuSnapshot,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
            taxTotal: l.taxTotal,
            total: l.total,
          }),
        );
        // Stock movement RETURN (+ stock).
        //   - Si la línea tenía snapshot de receta, usamos esa (histórica).
        //   - Sino, fallback a receta actual (líneas pre-migración 1026).
        //   - Variantes: mover stock de la variante en vez del padre.
        const recipe = l.kitRecipeSnapshot
          ?? (legacySnapById.get(l.productId)?.isKit
              ? legacySnapById.get(l.productId)!.kitComponents.map((c) => ({
                  componentProductId: c.componentProductId,
                  quantity: c.quantity,
                }))
              : null);
        if (recipe) {
          for (const comp of recipe) {
            const totalQty = (
              parseFloat(comp.quantity) * parseFloat(l.absLineForStock)
            ).toFixed(3);
            await this.stock.record(ctx, {
              productId: comp.componentProductId,
              type: StockMovementType.RETURN,
              quantity: totalQty,
              reason: `Devolución ${returnNumber} (kit ${l.productSkuSnapshot})`,
              saleId: sale.id,
              userId,
              branchId: sale.branchId,
            });
          }
        } else {
          await this.stock.record(ctx, {
            productId: l.productId,
            variantId: l.variantId,
            type: StockMovementType.RETURN,
            quantity: l.absLineForStock,
            reason: `Devolución ${returnNumber}`,
            saleId: sale.id,
            userId,
            branchId: sale.branchId,
          });
        }
      }

      // CASH: el dinero SALE del cajón → registra un PAID_OUT en la sesión para
      // que el arqueo descuente el reembolso del efectivo esperado (si no, la
      // caja aparecería corta por el monto devuelto). CARD/TRANSFER no tocan el
      // cajón; STORE_CREDIT/ACCOUNT se manejan en el ledger del cliente abajo.
      if (dto.refundMethod === RefundMethod.CASH) {
        await m.insert(CashMovementOrmEntity, {
          cashSessionId: session.id,
          type: CashMovementType.PAID_OUT,
          amount: fromCents(totalC),
          reason: `Devolución ${returnNumber} (venta ${sale.saleNumber})`,
          userId,
        });
      }

      // STORE_CREDIT: crea un REVERSAL en el ledger del cliente (a favor).
      if (dto.refundMethod === RefundMethod.STORE_CREDIT && sale.customerId) {
        await this.accounts.recordReversal(ctx, {
          customerId: sale.customerId,
          amount: fromCents(totalC),
          saleId: sale.id,
          userId,
        });
      }
      // ACCOUNT: reduce el saldo de crédito del cliente (REVERSAL — mismo efecto contable).
      if (dto.refundMethod === RefundMethod.ACCOUNT && sale.customerId) {
        await this.accounts.recordReversal(ctx, {
          customerId: sale.customerId,
          amount: fromCents(totalC),
          saleId: sale.id,
          userId,
        });
      }

      const refreshed = await m.findOne(SaleReturnOrmEntity, {
        where: { id: sr.id },
        relations: { items: true },
      });

      void this.audit.record({
        actorUserId: userId,
        action: 'sales.return',
        entityType: 'sale_return',
        entityId: sr.id,
        payload: {
          returnNumber,
          saleNumber: sale.saleNumber,
          total: fromCents(totalC),
          refundMethod: dto.refundMethod,
          itemsCount: dto.items.length,
        },
      });

      return toResponse(refreshed!, sale.saleNumber);
    });
  }
}

function fromCents(c: number): string {
  const sign = c < 0 ? '-' : '';
  const abs = Math.abs(c);
  return `${sign}${Math.trunc(abs / 100)}.${(abs % 100).toString().padStart(2, '0')}`;
}

function toResponse(
  r: SaleReturnOrmEntity,
  saleNumber: string | null,
): SaleReturnResponse {
  return {
    id: r.id,
    returnNumber: r.returnNumber,
    saleId: r.saleId,
    saleNumber,
    cashSessionId: r.cashSessionId,
    customerId: r.customerId,
    userId: r.userId,
    refundMethod: r.refundMethod as RefundMethod,
    subtotal: r.subtotal,
    taxTotal: r.taxTotal,
    total: r.total,
    reason: r.reason,
    notes: r.notes,
    items: (r.items ?? []).map((i) => ({
      id: i.id,
      saleItemId: i.saleItemId,
      productId: i.productId,
      productNameSnapshot: i.productNameSnapshot,
      productSkuSnapshot: i.productSkuSnapshot,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      taxRate: i.taxRate,
      taxTotal: i.taxTotal,
      total: i.total,
    })),
    createdAt: r.createdAt.toISOString(),
  };
}
