import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../../common/persistence/unit-of-work.port';
import type { CashSession } from '../../domain/entities/cash-session.entity';
import {
  CashSessionAlreadyClosedError,
  CashSessionNotFoundError,
  InvalidCashAmountError,
} from '../../domain/errors/cash-session.errors';
import {
  CASH_PAYMENT_TOTALS_PORT,
  type CashPaymentTotalsPort,
} from '../../domain/ports/cash-payment-totals.port';
import {
  CASH_SESSION_REPOSITORY,
  type CashSessionRepository,
} from '../../domain/ports/cash-session.repository.port';
import { CashSessionStatus } from '../../domain/value-objects/cash-session-status';
import { addMoney, subMoney } from '../math/money';

export interface CloseCashSessionInput {
  sessionId: string;
  countedAmount: string;
  notes?: string | null;
  closedById: string;
}

@Injectable()
export class CloseCashSessionUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CASH_SESSION_REPOSITORY)
    private readonly sessions: CashSessionRepository,
    @Inject(CASH_PAYMENT_TOTALS_PORT)
    private readonly totals: CashPaymentTotalsPort,
  ) {}

  async execute(input: CloseCashSessionInput): Promise<CashSession> {
    this.assertAmount(input.countedAmount);

    const session = await this.sessions.findById(input.sessionId);
    if (!session) throw new CashSessionNotFoundError(input.sessionId);
    if (session.status !== CashSessionStatus.OPEN) {
      throw new CashSessionAlreadyClosedError(session.id);
    }

    const { cashSales, cashRefunds } = await this.totals.forSession(session.id);
    const expected = subMoney(addMoney(session.openingAmount, cashSales), cashRefunds);
    const difference = subMoney(input.countedAmount, expected);

    return this.uow.run((ctx) =>
      this.sessions.close(ctx, session.id, {
        closedById: input.closedById,
        closedAt: new Date(),
        expectedAmount: expected,
        countedAmount: input.countedAmount,
        difference,
        notes: input.notes ?? session.notes,
      }),
    );
  }

  private assertAmount(amount: string): void {
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      throw new InvalidCashAmountError(`Monto contado inválido: ${amount}`);
    }
    if (parseFloat(amount) < 0) {
      throw new InvalidCashAmountError('Monto contado no puede ser negativo');
    }
  }
}
