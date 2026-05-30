import type { CashMovementType } from '../value-objects/cash-movement-type';

export interface CashMovement {
  readonly id: string;
  readonly cashSessionId: string;
  readonly type: CashMovementType;
  /** Siempre positivo. El signo lo da `type`. */
  readonly amount: string;
  readonly reason: string;
  readonly userId: string;
  readonly createdAt: Date;
}
