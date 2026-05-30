import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../../common/persistence/unit-of-work.port';
import type { CashMovement } from '../../domain/entities/cash-movement.entity';
import {
  CashSessionAlreadyClosedError,
  CashSessionNotFoundError,
  InvalidCashAmountError,
} from '../../domain/errors/cash-session.errors';
import {
  CASH_MOVEMENT_REPOSITORY,
  type CashMovementRepository,
} from '../../domain/ports/cash-movement.repository.port';
import {
  CASH_SESSION_REPOSITORY,
  type CashSessionRepository,
} from '../../domain/ports/cash-session.repository.port';
import { CashSessionStatus } from '../../domain/value-objects/cash-session-status';
import type { CashMovementType } from '../../domain/value-objects/cash-movement-type';

export interface RecordCashMovementInput {
  sessionId: string;
  type: CashMovementType;
  amount: string;
  reason: string;
  userId: string;
}

@Injectable()
export class RecordCashMovementUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CASH_SESSION_REPOSITORY) private readonly sessions: CashSessionRepository,
    @Inject(CASH_MOVEMENT_REPOSITORY) private readonly movements: CashMovementRepository,
  ) {}

  async execute(input: RecordCashMovementInput): Promise<CashMovement> {
    if (!/^\d+(\.\d{1,2})?$/.test(input.amount)) {
      throw new InvalidCashAmountError(`Monto inválido: ${input.amount}`);
    }
    if (parseFloat(input.amount) <= 0) {
      throw new InvalidCashAmountError('Monto debe ser mayor que cero');
    }
    if (!input.reason || input.reason.trim().length < 3) {
      throw new InvalidCashAmountError('Motivo es requerido (mín. 3 caracteres)');
    }

    const session = await this.sessions.findById(input.sessionId);
    if (!session) throw new CashSessionNotFoundError(input.sessionId);
    if (session.status !== CashSessionStatus.OPEN) {
      throw new CashSessionAlreadyClosedError(session.id);
    }

    return this.uow.run((ctx) =>
      this.movements.insert(ctx, {
        cashSessionId: session.id,
        type: input.type,
        amount: input.amount,
        reason: input.reason.trim(),
        userId: input.userId,
      }),
    );
  }
}
