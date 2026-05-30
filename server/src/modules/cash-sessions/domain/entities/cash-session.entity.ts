import type { CashSessionStatus } from '../value-objects/cash-session-status';

/** Mapa denominación-en-pesos → cantidad de billetes/monedas contados. */
export type DenominationCounts = Record<string, number>;

export interface CashSession {
  readonly id: string;
  readonly branchId: string | null;
  readonly cashRegisterId: string;
  readonly openedById: string;
  readonly closedById: string | null;
  readonly openedAt: Date;
  readonly closedAt: Date | null;
  readonly openingAmount: string;
  readonly openingDenominations: DenominationCounts | null;
  readonly expectedAmount: string | null;
  readonly countedAmount: string | null;
  readonly closingDenominations: DenominationCounts | null;
  /** Monto declarado por el cajero por método al cerrar.
   *  Ej: `{ "CASH": "500.00", "CARD": "300.00" }`. Null si no se declaró. */
  readonly closingDeclaredByMethod: Record<string, string> | null;
  readonly difference: string | null;
  readonly status: CashSessionStatus;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
