import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashSessionOrmEntity } from '../../../../cash-sessions/infrastructure/persistence/typeorm/cash-session.orm-entity';
import type {
  CashSessionValidatorPort,
  ValidatedSession,
} from '../../../domain/ports/cash-session-validator.port';

@Injectable()
export class CashSessionValidatorTypeOrm implements CashSessionValidatorPort {
  constructor(
    @InjectRepository(CashSessionOrmEntity)
    private readonly repo: Repository<CashSessionOrmEntity>,
  ) {}

  async validateOpen(
    sessionId: string,
    expectedUserId?: string,
  ): Promise<ValidatedSession | null> {
    const s = await this.repo.findOne({ where: { id: sessionId, status: 'OPEN' } });
    if (!s) return null;
    if (expectedUserId && s.openedById !== expectedUserId) return null;
    return {
      id: s.id,
      cashRegisterId: s.cashRegisterId,
      openedById: s.openedById,
      branchId: s.branchId,
    };
  }
}
