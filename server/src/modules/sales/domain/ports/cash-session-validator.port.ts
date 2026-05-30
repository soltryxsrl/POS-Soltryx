export const CASH_SESSION_VALIDATOR_PORT = Symbol('CASH_SESSION_VALIDATOR_PORT');

export interface ValidatedSession {
  id: string;
  cashRegisterId: string;
  openedById: string;
  branchId: string | null;
}

/**
 * Valida que una sesión de caja esté OPEN. Si `expectedUserId` se provee,
 * además exige que la sesión pertenezca a ese usuario (no aplica a ADMIN/MANAGER
 * que pueden vender en cualquier sesión abierta — esa política la decide
 * el use case caller).
 */
export interface CashSessionValidatorPort {
  validateOpen(
    sessionId: string,
    expectedUserId?: string,
  ): Promise<ValidatedSession | null>;
}
