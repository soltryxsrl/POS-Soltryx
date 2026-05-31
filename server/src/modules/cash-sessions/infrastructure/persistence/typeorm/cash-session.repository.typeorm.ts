import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { resolveSort } from '../../../../../common/dto/pagination-sort.query';
import type { TransactionContext } from '../../../../../common/persistence/unit-of-work.port';
import type { CashSession } from '../../../domain/entities/cash-session.entity';
import type {
  CashSessionRepository,
  CloseCashSessionPatch,
  ListSessionsFilter,
  ListSessionsResult,
  OpenCashSessionInput,
} from '../../../domain/ports/cash-session.repository.port';
import { CashSessionStatus } from '../../../domain/value-objects/cash-session-status';
import { CashSessionOrmEntity } from './cash-session.orm-entity';

function toDomain(e: CashSessionOrmEntity): CashSession {
  return {
    id: e.id,
    branchId: e.branchId,
    cashRegisterId: e.cashRegisterId,
    openedById: e.openedById,
    closedById: e.closedById,
    openedAt: e.openedAt,
    closedAt: e.closedAt,
    openingAmount: e.openingAmount,
    openingDenominations: e.openingDenominations,
    expectedAmount: e.expectedAmount,
    countedAmount: e.countedAmount,
    closingDenominations: e.closingDenominations,
    closingDeclaredByMethod: e.closingDeclaredByMethod,
    difference: e.difference,
    status: e.status as CashSession['status'],
    notes: e.notes,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

@Injectable()
export class CashSessionRepositoryTypeOrm implements CashSessionRepository {
  constructor(
    @InjectRepository(CashSessionOrmEntity)
    private readonly repo: Repository<CashSessionOrmEntity>,
  ) {}

  async open(ctx: TransactionContext, input: OpenCashSessionInput): Promise<CashSession> {
    const repo = ctx.manager.getRepository(CashSessionOrmEntity);
    const entity = repo.create({
      branchId: input.branchId ?? null,
      cashRegisterId: input.cashRegisterId,
      openedById: input.openedById,
      openedAt: new Date(),
      openingAmount: input.openingAmount,
      openingDenominations: input.openingDenominations ?? null,
      status: CashSessionStatus.OPEN,
      notes: input.notes ?? null,
    });
    const saved = await repo.save(entity);
    return toDomain(saved);
  }

  async close(
    ctx: TransactionContext,
    sessionId: string,
    patch: CloseCashSessionPatch,
  ): Promise<CashSession> {
    const repo = ctx.manager.getRepository(CashSessionOrmEntity);
    await repo.update(
      { id: sessionId },
      {
        closedById: patch.closedById,
        closedAt: patch.closedAt,
        expectedAmount: patch.expectedAmount,
        countedAmount: patch.countedAmount,
        closingDenominations: patch.closingDenominations ?? null,
        closingDeclaredByMethod: patch.closingDeclaredByMethod ?? null,
        difference: patch.difference,
        status: CashSessionStatus.CLOSED,
        notes: patch.notes ?? null,
      },
    );
    const refreshed = await repo.findOne({ where: { id: sessionId } });
    if (!refreshed) throw new Error(`Session ${sessionId} disappeared after close`);
    return toDomain(refreshed);
  }

  async findById(id: string): Promise<CashSession | null> {
    const r = await this.repo.findOne({ where: { id } });
    return r ? toDomain(r) : null;
  }

  async findActiveForRegister(cashRegisterId: string): Promise<CashSession | null> {
    const r = await this.repo.findOne({
      where: { cashRegisterId, status: CashSessionStatus.OPEN },
    });
    return r ? toDomain(r) : null;
  }

  async findActiveForUser(userId: string): Promise<CashSession | null> {
    const r = await this.repo.findOne({
      where: { openedById: userId, status: CashSessionStatus.OPEN },
    });
    return r ? toDomain(r) : null;
  }

  async list(filter: ListSessionsFilter): Promise<ListSessionsResult> {
    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;
    const sort = resolveSort(
      filter.sort,
      filter.sortDir,
      ['openedAt', 'closedAt', 'expectedAmount'] as const,
      { column: 'openedAt', dir: 'desc' },
    );
    const sortColumnMap = {
      openedAt: 's.opened_at',
      closedAt: 's.closed_at',
      expectedAmount: 's.expected_amount',
    } as const;
    const qb = this.repo
      .createQueryBuilder('s')
      .orderBy(sortColumnMap[sort.column], sort.dir.toUpperCase() as 'ASC' | 'DESC')
      .take(limit)
      .skip(offset);
    if (filter.status) qb.andWhere('s.status = :st', { st: filter.status });
    if (filter.cashRegisterId)
      qb.andWhere('s.cash_register_id = :cr', { cr: filter.cashRegisterId });
    if (filter.openedById) qb.andWhere('s.opened_by_id = :u', { u: filter.openedById });
    if (filter.branchId) qb.andWhere('s.branch_id = :branchId', { branchId: filter.branchId });
    if (filter.from) qb.andWhere('s.opened_at >= :from', { from: filter.from });
    if (filter.to) qb.andWhere('s.opened_at <= :to', { to: filter.to });
    const [items, total] = await qb.getManyAndCount();
    return { items: items.map(toDomain), total };
  }
}
