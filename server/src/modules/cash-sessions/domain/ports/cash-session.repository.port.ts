import type { TransactionContext } from '../../../../common/persistence/unit-of-work.port';
import type { CashSession } from '../entities/cash-session.entity';
import type { CashSessionStatus } from '../value-objects/cash-session-status';

export const CASH_SESSION_REPOSITORY = Symbol('CASH_SESSION_REPOSITORY');

export interface OpenCashSessionInput {
  cashRegisterId: string;
  openedById: string;
  openingAmount: string;
  notes?: string | null;
  branchId?: string | null;
}

export interface CloseCashSessionPatch {
  closedById: string;
  closedAt: Date;
  expectedAmount: string;
  countedAmount: string;
  difference: string;
  notes?: string | null;
}

export interface ListSessionsFilter {
  status?: CashSessionStatus;
  cashRegisterId?: string;
  openedById?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface ListSessionsResult {
  items: CashSession[];
  total: number;
}

export interface CashSessionRepository {
  open(ctx: TransactionContext, input: OpenCashSessionInput): Promise<CashSession>;
  close(
    ctx: TransactionContext,
    sessionId: string,
    patch: CloseCashSessionPatch,
  ): Promise<CashSession>;
  findById(id: string): Promise<CashSession | null>;
  findActiveForRegister(cashRegisterId: string): Promise<CashSession | null>;
  findActiveForUser(userId: string): Promise<CashSession | null>;
  list(filter: ListSessionsFilter): Promise<ListSessionsResult>;
}
