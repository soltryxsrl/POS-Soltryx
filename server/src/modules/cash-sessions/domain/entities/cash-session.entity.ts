import type { CashSessionStatus } from '../value-objects/cash-session-status';

export interface CashSession {
  readonly id: string;
  readonly branchId: string | null;
  readonly cashRegisterId: string;
  readonly openedById: string;
  readonly closedById: string | null;
  readonly openedAt: Date;
  readonly closedAt: Date | null;
  readonly openingAmount: string;
  readonly expectedAmount: string | null;
  readonly countedAmount: string | null;
  readonly difference: string | null;
  readonly status: CashSessionStatus;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
