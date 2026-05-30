import { Inject, Injectable } from '@nestjs/common';
import type { CashMovement } from '../../domain/entities/cash-movement.entity';
import { CashSessionNotFoundError } from '../../domain/errors/cash-session.errors';
import {
  CASH_MOVEMENT_REPOSITORY,
  type CashMovementRepository,
} from '../../domain/ports/cash-movement.repository.port';
import {
  CASH_SESSION_REPOSITORY,
  type CashSessionRepository,
} from '../../domain/ports/cash-session.repository.port';

@Injectable()
export class ListCashMovementsUseCase {
  constructor(
    @Inject(CASH_SESSION_REPOSITORY) private readonly sessions: CashSessionRepository,
    @Inject(CASH_MOVEMENT_REPOSITORY) private readonly movements: CashMovementRepository,
  ) {}

  async execute(sessionId: string): Promise<CashMovement[]> {
    const session = await this.sessions.findById(sessionId);
    if (!session) throw new CashSessionNotFoundError(sessionId);
    return this.movements.listForSession(session.id);
  }
}
