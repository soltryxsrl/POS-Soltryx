import type { TransactionContext } from '../../../../common/persistence/unit-of-work.port';
import type { CashMovement } from '../entities/cash-movement.entity';
import type { CashMovementType } from '../value-objects/cash-movement-type';

export const CASH_MOVEMENT_REPOSITORY = Symbol('CASH_MOVEMENT_REPOSITORY');

export interface InsertCashMovementInput {
  cashSessionId: string;
  type: CashMovementType;
  amount: string;
  reason: string;
  userId: string;
}

export interface CashMovementRepository {
  insert(ctx: TransactionContext, input: InsertCashMovementInput): Promise<CashMovement>;
  listForSession(sessionId: string): Promise<CashMovement[]>;
}
