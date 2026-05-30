import { Inject, Injectable } from '@nestjs/common';
import type { CashSession } from '../../domain/entities/cash-session.entity';
import { CashSessionNotFoundError } from '../../domain/errors/cash-session.errors';
import {
  CASH_PAYMENT_TOTALS_PORT,
  type CashPaymentTotalsPort,
} from '../../domain/ports/cash-payment-totals.port';
import {
  CASH_SESSION_REPOSITORY,
  type CashSessionRepository,
} from '../../domain/ports/cash-session.repository.port';
import { addMoney, subMoney } from '../math/money';

export interface CashSessionSummary {
  session: CashSession;
  openingAmount: string;
  cashSales: string;
  cashRefunds: string;
  nonCashSales: string;
  paidIns: string;
  paidOuts: string;
  expectedAmount: string;
  countedAmount: string | null;
  difference: string | null;
}

@Injectable()
export class GetSessionSummaryUseCase {
  constructor(
    @Inject(CASH_SESSION_REPOSITORY)
    private readonly sessions: CashSessionRepository,
    @Inject(CASH_PAYMENT_TOTALS_PORT)
    private readonly totals: CashPaymentTotalsPort,
  ) {}

  async execute(sessionId: string): Promise<CashSessionSummary> {
    const session = await this.sessions.findById(sessionId);
    if (!session) throw new CashSessionNotFoundError(sessionId);

    const { cashSales, cashRefunds, nonCashSales, paidIns, paidOuts } =
      await this.totals.forSession(session.id);
    const afterSales = subMoney(addMoney(session.openingAmount, cashSales), cashRefunds);
    const expected = subMoney(addMoney(afterSales, paidIns), paidOuts);

    return {
      session,
      openingAmount: session.openingAmount,
      cashSales,
      cashRefunds,
      nonCashSales,
      paidIns,
      paidOuts,
      expectedAmount: session.expectedAmount ?? expected,
      countedAmount: session.countedAmount,
      difference: session.difference,
    };
  }
}
