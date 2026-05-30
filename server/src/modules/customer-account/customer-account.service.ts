import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
  type TransactionContext,
} from '../../common/persistence/unit-of-work.port';
import { CustomerOrmEntity } from '../customers/customer.orm-entity';
import {
  AccountEntryType,
  CustomerAccountEntryOrmEntity,
} from './customer-account-entry.orm-entity';

export interface AccountEntryResponse {
  id: string;
  customerId: string;
  type: AccountEntryType;
  amount: string;
  saleId: string | null;
  cashSessionId: string | null;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  userId: string;
  createdAt: string;
}

export interface CustomerAccountSummary {
  customerId: string;
  customerName: string;
  balance: string;
  chargeTotal: string;
  paymentTotal: string;
  reversalTotal: string;
  entries: AccountEntryResponse[];
}

export interface RegisterChargeInput {
  customerId: string;
  amount: string;
  saleId: string;
  cashSessionId: string;
  userId: string;
}

export interface RegisterPaymentInput {
  customerId: string;
  amount: string;
  paymentMethod: string;
  cashSessionId?: string | null;
  reference?: string | null;
  notes?: string | null;
  userId: string;
}

export interface RegisterReversalInput {
  customerId: string;
  amount: string;
  saleId: string;
  userId: string;
}

const SUMMARY_LIMIT = 200;

@Injectable()
export class CustomerAccountService {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @InjectRepository(CustomerAccountEntryOrmEntity)
    private readonly entries: Repository<CustomerAccountEntryOrmEntity>,
    @InjectRepository(CustomerOrmEntity)
    private readonly customers: Repository<CustomerOrmEntity>,
  ) {}

  async getSummary(customerId: string): Promise<CustomerAccountSummary> {
    const customer = await this.customers.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException(`Cliente ${customerId} no encontrado`);

    const rows = await this.entries.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: SUMMARY_LIMIT,
    });

    let chargeC = 0;
    let paymentC = 0;
    let reversalC = 0;
    for (const r of rows) {
      const cents = Math.round(parseFloat(r.amount) * 100);
      if (r.type === AccountEntryType.CHARGE) chargeC += cents;
      else if (r.type === AccountEntryType.PAYMENT) paymentC += cents;
      else if (r.type === AccountEntryType.REVERSAL) reversalC += cents;
    }
    // Si hay más de SUMMARY_LIMIT filas, totales fluyen por SQL aparte:
    if (rows.length === SUMMARY_LIMIT) {
      const agg = await this.entries
        .createQueryBuilder('e')
        .select('e.type', 'type')
        .addSelect('COALESCE(SUM(e.amount), 0)', 'total')
        .where('e.customer_id = :cid', { cid: customerId })
        .groupBy('e.type')
        .getRawMany<{ type: string; total: string }>();
      chargeC = 0;
      paymentC = 0;
      reversalC = 0;
      for (const a of agg) {
        const cents = Math.round(parseFloat(a.total) * 100);
        if (a.type === AccountEntryType.CHARGE) chargeC = cents;
        else if (a.type === AccountEntryType.PAYMENT) paymentC = cents;
        else if (a.type === AccountEntryType.REVERSAL) reversalC = cents;
      }
    }

    const balanceC = chargeC - paymentC - reversalC;

    return {
      customerId: customer.id,
      customerName: customer.fullName,
      balance: fromCents(balanceC),
      chargeTotal: fromCents(chargeC),
      paymentTotal: fromCents(paymentC),
      reversalTotal: fromCents(reversalC),
      entries: rows.map(toEntryResponse),
    };
  }

  /** Registra una CHARGE (usada por create-sale dentro de la misma tx). */
  async recordCharge(
    ctx: TransactionContext,
    input: RegisterChargeInput,
  ): Promise<void> {
    const repo = ctx.manager.getRepository(CustomerAccountEntryOrmEntity);
    const entity = repo.create({
      customerId: input.customerId,
      type: AccountEntryType.CHARGE,
      amount: input.amount,
      saleId: input.saleId,
      cashSessionId: input.cashSessionId,
      paymentMethod: 'ACCOUNT',
      userId: input.userId,
    });
    await repo.save(entity);
  }

  /** Registra una REVERSAL al cancelar una venta que fue parcial o totalmente fiada. */
  async recordReversal(
    ctx: TransactionContext,
    input: RegisterReversalInput,
  ): Promise<void> {
    const repo = ctx.manager.getRepository(CustomerAccountEntryOrmEntity);
    const entity = repo.create({
      customerId: input.customerId,
      type: AccountEntryType.REVERSAL,
      amount: input.amount,
      saleId: input.saleId,
      userId: input.userId,
      notes: 'Reversal por anulación de venta',
    });
    await repo.save(entity);
  }

  /** Endpoint POST: cliente abona contra su cuenta. */
  async registerPayment(input: RegisterPaymentInput): Promise<AccountEntryResponse> {
    if (!/^\d+(\.\d{1,2})?$/.test(input.amount)) {
      throw new ConflictException(`Monto inválido: ${input.amount}`);
    }
    if (parseFloat(input.amount) <= 0) {
      throw new ConflictException('El monto debe ser mayor que cero');
    }
    const customer = await this.customers.findOne({ where: { id: input.customerId } });
    if (!customer) throw new NotFoundException(`Cliente ${input.customerId} no encontrado`);

    return this.uow.run(async (ctx) => {
      const repo = ctx.manager.getRepository(CustomerAccountEntryOrmEntity);
      const entity = repo.create({
        customerId: customer.id,
        type: AccountEntryType.PAYMENT,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        cashSessionId: input.cashSessionId ?? null,
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
        userId: input.userId,
      });
      const saved = await repo.save(entity);
      return toEntryResponse(saved);
    });
  }
}

function fromCents(c: number): string {
  const sign = c < 0 ? '-' : '';
  const abs = Math.abs(c);
  return `${sign}${Math.trunc(abs / 100)}.${(abs % 100).toString().padStart(2, '0')}`;
}

function toEntryResponse(e: CustomerAccountEntryOrmEntity): AccountEntryResponse {
  return {
    id: e.id,
    customerId: e.customerId,
    type: e.type as AccountEntryType,
    amount: e.amount,
    saleId: e.saleId,
    cashSessionId: e.cashSessionId,
    paymentMethod: e.paymentMethod,
    reference: e.reference,
    notes: e.notes,
    userId: e.userId,
    createdAt: e.createdAt.toISOString(),
  };
}
