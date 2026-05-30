import { Inject, Injectable } from '@nestjs/common';
import type { CashSession } from '../../domain/entities/cash-session.entity';
import {
  CASH_SESSION_REPOSITORY,
  type CashSessionRepository,
} from '../../domain/ports/cash-session.repository.port';

export interface GetActiveSessionInput {
  cashRegisterId?: string;
  userId?: string;
}

@Injectable()
export class GetActiveSessionUseCase {
  constructor(
    @Inject(CASH_SESSION_REPOSITORY)
    private readonly sessions: CashSessionRepository,
  ) {}

  async execute(input: GetActiveSessionInput): Promise<CashSession | null> {
    if (input.cashRegisterId) {
      return this.sessions.findActiveForRegister(input.cashRegisterId);
    }
    if (input.userId) {
      return this.sessions.findActiveForUser(input.userId);
    }
    return null;
  }
}
