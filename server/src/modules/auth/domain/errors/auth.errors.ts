/**
 * Errores de dominio de Auth. Los use cases lanzan estos.
 * El controller los traduce a HTTP via exception filter (o directamente).
 */

export class InvalidCredentialsError extends Error {
  readonly code = 'INVALID_CREDENTIALS';
  constructor() {
    super('Credenciales inválidas');
    this.name = 'InvalidCredentialsError';
  }
}

export class UserInactiveError extends Error {
  readonly code = 'USER_INACTIVE';
  constructor() {
    super('Usuario inactivo');
    this.name = 'UserInactiveError';
  }
}

export class RefreshTokenInvalidError extends Error {
  readonly code = 'REFRESH_TOKEN_INVALID';
  constructor(reason?: string) {
    super(reason ? `Refresh token inválido: ${reason}` : 'Refresh token inválido');
    this.name = 'RefreshTokenInvalidError';
  }
}
