export class CashRegisterNotFoundError extends Error {
  readonly code = 'CASH_REGISTER_NOT_FOUND';
  constructor(id: string) {
    super(`Caja registradora ${id} no encontrada`);
    this.name = 'CashRegisterNotFoundError';
  }
}

export class CashRegisterInactiveError extends Error {
  readonly code = 'CASH_REGISTER_INACTIVE';
  constructor(id: string) {
    super(`Caja registradora ${id} está inactiva`);
    this.name = 'CashRegisterInactiveError';
  }
}

export class CashSessionNotFoundError extends Error {
  readonly code = 'CASH_SESSION_NOT_FOUND';
  constructor(id: string) {
    super(`Sesión de caja ${id} no encontrada`);
    this.name = 'CashSessionNotFoundError';
  }
}

export class CashSessionAlreadyOpenError extends Error {
  readonly code = 'CASH_SESSION_ALREADY_OPEN';
  constructor(
    public readonly cashRegisterId: string,
    public readonly existingSessionId: string,
  ) {
    super(
      `Ya hay una sesión abierta (${existingSessionId}) en la caja registradora ${cashRegisterId}`,
    );
    this.name = 'CashSessionAlreadyOpenError';
  }
}

export class CashSessionAlreadyClosedError extends Error {
  readonly code = 'CASH_SESSION_ALREADY_CLOSED';
  constructor(sessionId: string) {
    super(`La sesión ${sessionId} ya está cerrada`);
    this.name = 'CashSessionAlreadyClosedError';
  }
}

export class InvalidCashAmountError extends Error {
  readonly code = 'INVALID_CASH_AMOUNT';
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCashAmountError';
  }
}
