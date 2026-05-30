import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TransactionContext } from '../../../../../common/persistence/unit-of-work.port';
import type { Payment } from '../../../domain/entities/payment.entity';
import type { Sale } from '../../../domain/entities/sale.entity';
import type { SaleItem } from '../../../domain/entities/sale-item.entity';
import type {
  CancelSalePatch,
  InsertSaleInput,
  ListSalesFilter,
  ListSalesResult,
  SaleRepository,
} from '../../../domain/ports/sale.repository.port';
import type { PaymentMethod, PaymentStatus } from '../../../domain/value-objects/payment-method';
import { SaleStatus, type FiscalStatus } from '../../../domain/value-objects/sale-status';
import { PaymentOrmEntity } from './payment.orm-entity';
import { SaleItemOrmEntity } from './sale-item.orm-entity';
import { SaleOrmEntity } from './sale.orm-entity';

function itemToDomain(e: SaleItemOrmEntity): SaleItem {
  return {
    id: e.id,
    saleId: e.saleId,
    productId: e.productId,
    productNameSnapshot: e.productNameSnapshot,
    productSkuSnapshot: e.productSkuSnapshot,
    quantity: e.quantity,
    unitPrice: e.unitPrice,
    discount: e.discount,
    taxRate: e.taxRate,
    taxTotal: e.taxTotal,
    total: e.total,
    createdAt: e.createdAt,
  };
}

function paymentToDomain(e: PaymentOrmEntity): Payment {
  return {
    id: e.id,
    saleId: e.saleId,
    method: e.method as PaymentMethod,
    amount: e.amount,
    reference: e.reference,
    status: e.status as PaymentStatus,
    createdAt: e.createdAt,
  };
}

function saleToDomain(
  e: SaleOrmEntity,
  items: SaleItemOrmEntity[] = e.items ?? [],
  payments: PaymentOrmEntity[] = e.payments ?? [],
): Sale {
  return {
    id: e.id,
    branchId: e.branchId,
    saleNumber: e.saleNumber,
    customerId: e.customerId,
    userId: e.userId,
    cashSessionId: e.cashSessionId,
    subtotal: e.subtotal,
    discountTotal: e.discountTotal,
    taxTotal: e.taxTotal,
    total: e.total,
    status: e.status as Sale['status'],
    fiscalStatus: e.fiscalStatus as FiscalStatus,
    fiscalDocumentId: e.fiscalDocumentId,
    notes: e.notes,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    cancelledAt: e.cancelledAt,
    cancelledById: e.cancelledById,
    cancelReason: e.cancelReason,
    items: items.map(itemToDomain),
    payments: payments.map(paymentToDomain),
  };
}

@Injectable()
export class SaleRepositoryTypeOrm implements SaleRepository {
  constructor(
    @InjectRepository(SaleOrmEntity) private readonly sales: Repository<SaleOrmEntity>,
    @InjectRepository(SaleItemOrmEntity)
    private readonly items: Repository<SaleItemOrmEntity>,
    @InjectRepository(PaymentOrmEntity)
    private readonly payments: Repository<PaymentOrmEntity>,
  ) {}

  async insert(ctx: TransactionContext, input: InsertSaleInput): Promise<Sale> {
    const salesRepo = ctx.manager.getRepository(SaleOrmEntity);
    const itemsRepo = ctx.manager.getRepository(SaleItemOrmEntity);
    const paymentsRepo = ctx.manager.getRepository(PaymentOrmEntity);

    const sale = salesRepo.create({
      branchId: input.branchId,
      saleNumber: input.saleNumber,
      customerId: input.customerId,
      userId: input.userId,
      cashSessionId: input.cashSessionId,
      subtotal: input.subtotal,
      discountTotal: input.discountTotal,
      taxTotal: input.taxTotal,
      total: input.total,
      status: SaleStatus.COMPLETED,
      fiscalStatus: 'NOT_REQUIRED',
      notes: input.notes,
    });
    const savedSale = await salesRepo.save(sale);

    const itemEntities = input.items.map((i) =>
      itemsRepo.create({
        saleId: savedSale.id,
        productId: i.productId,
        productNameSnapshot: i.productNameSnapshot,
        productSkuSnapshot: i.productSkuSnapshot,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        taxRate: i.taxRate,
        taxTotal: i.taxTotal,
        total: i.total,
      }),
    );
    const savedItems = await itemsRepo.save(itemEntities);

    const paymentEntities = input.payments.map((p) =>
      paymentsRepo.create({
        saleId: savedSale.id,
        method: p.method,
        amount: p.amount,
        reference: p.reference,
        status: 'COMPLETED',
      }),
    );
    const savedPayments = await paymentsRepo.save(paymentEntities);

    return saleToDomain(savedSale, savedItems, savedPayments);
  }

  async markCancelled(
    ctx: TransactionContext,
    saleId: string,
    patch: CancelSalePatch,
  ): Promise<Sale> {
    const repo = ctx.manager.getRepository(SaleOrmEntity);
    await repo.update(
      { id: saleId },
      {
        status: SaleStatus.CANCELLED,
        cancelledAt: patch.cancelledAt,
        cancelledById: patch.cancelledById,
        cancelReason: patch.cancelReason,
      },
    );
    const refreshed = await ctx.manager.findOne(SaleOrmEntity, {
      where: { id: saleId },
      relations: { items: true, payments: true },
    });
    if (!refreshed) throw new Error(`Sale ${saleId} disappeared after cancel`);
    return saleToDomain(refreshed);
  }

  async findById(id: string): Promise<Sale | null> {
    const r = await this.sales.findOne({
      where: { id },
      relations: { items: true, payments: true },
    });
    return r ? saleToDomain(r) : null;
  }

  async findItemsForCancellation(
    ctx: TransactionContext,
    saleId: string,
  ): Promise<SaleItem[]> {
    const rows = await ctx.manager.find(SaleItemOrmEntity, { where: { saleId } });
    return rows.map(itemToDomain);
  }

  async findPaymentsForSale(saleId: string): Promise<Payment[]> {
    const rows = await this.payments.find({ where: { saleId } });
    return rows.map(paymentToDomain);
  }

  async list(filter: ListSalesFilter): Promise<ListSalesResult> {
    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;
    const qb = this.sales
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.items', 'i')
      .leftJoinAndSelect('s.payments', 'p')
      .orderBy('s.createdAt', 'DESC')
      .take(limit)
      .skip(offset);
    if (filter.status) qb.andWhere('s.status = :st', { st: filter.status });
    if (filter.cashSessionId)
      qb.andWhere('s.cashSessionId = :cs', { cs: filter.cashSessionId });
    if (filter.userId) qb.andWhere('s.userId = :u', { u: filter.userId });
    if (filter.from) qb.andWhere('s.createdAt >= :from', { from: filter.from });
    if (filter.to) qb.andWhere('s.createdAt <= :to', { to: filter.to });
    const [items, total] = await qb.getManyAndCount();
    return { items: items.map((s) => saleToDomain(s)), total };
  }
}
