import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TransactionContext } from '../../../../../common/persistence/unit-of-work.port';
import type { CashMovement } from '../../../domain/entities/cash-movement.entity';
import type {
  CashMovementRepository,
  InsertCashMovementInput,
} from '../../../domain/ports/cash-movement.repository.port';
import type { CashMovementType } from '../../../domain/value-objects/cash-movement-type';
import { CashMovementOrmEntity } from './cash-movement.orm-entity';

function toDomain(e: CashMovementOrmEntity): CashMovement {
  return {
    id: e.id,
    cashSessionId: e.cashSessionId,
    type: e.type as CashMovementType,
    amount: e.amount,
    reason: e.reason,
    userId: e.userId,
    createdAt: e.createdAt,
  };
}

@Injectable()
export class CashMovementRepositoryTypeOrm implements CashMovementRepository {
  constructor(
    @InjectRepository(CashMovementOrmEntity)
    private readonly repo: Repository<CashMovementOrmEntity>,
  ) {}

  async insert(
    ctx: TransactionContext,
    input: InsertCashMovementInput,
  ): Promise<CashMovement> {
    const repo = ctx.manager.getRepository(CashMovementOrmEntity);
    const entity = repo.create({
      cashSessionId: input.cashSessionId,
      type: input.type,
      amount: input.amount,
      reason: input.reason,
      userId: input.userId,
    });
    const saved = await repo.save(entity);
    return toDomain(saved);
  }

  async listForSession(sessionId: string): Promise<CashMovement[]> {
    const rows = await this.repo.find({
      where: { cashSessionId: sessionId },
      order: { createdAt: 'ASC' },
    });
    return rows.map(toDomain);
  }
}
