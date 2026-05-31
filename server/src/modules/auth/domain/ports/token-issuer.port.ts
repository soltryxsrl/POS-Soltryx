/**
 * Emite y verifica tokens (access + refresh).
 * Adapter actual: JWT (jsonwebtoken vía @nestjs/jwt).
 *
 * Mantener el puerto permite cambiar a otra estrategia (opaque tokens, PASETO, etc.)
 * sin tocar los use cases.
 */
export const TOKEN_ISSUER = Symbol('TOKEN_ISSUER');

export interface AccessTokenPayload {
  /** subject — userId */
  sub: string;
  username: string;
  roles: string[];
  permissions: string[];
  /** sucursal HOME del usuario (null = ADMIN sin sucursal) */
  branchId: string | null;
}

export interface RefreshTokenPayload {
  /** subject — userId */
  sub: string;
  /** identificador del token (para revocación / rotación) */
  jti: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  /** identificador del refresh emitido (para persistir en DB) */
  refreshTokenId: string;
  /** segundos hasta expiración del access token */
  accessTokenExpiresInSec: number;
  /** fecha absoluta de expiración del refresh */
  refreshTokenExpiresAt: Date;
}

export interface TokenIssuer {
  issue(payload: {
    sub: string;
    username: string;
    roles: string[];
    permissions: string[];
    branchId: string | null;
  }): Promise<IssuedTokens>;
  verifyAccess(token: string): Promise<AccessTokenPayload>;
  verifyRefresh(token: string): Promise<RefreshTokenPayload>;
}
