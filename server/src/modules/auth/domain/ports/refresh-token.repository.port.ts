/**
 * Persistencia de refresh tokens. Cada token vive como una fila para permitir:
 *   - rotación: revocamos el viejo y emitimos uno nuevo en cada /auth/refresh
 *   - revocación al logout
 *   - auditoría (user-agent, IP, fecha)
 *
 * Almacenamos solo el HASH del token, nunca el valor crudo.
 */
export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface StoredRefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface SaveRefreshTokenInput {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface RefreshTokenRepository {
  save(input: SaveRefreshTokenInput): Promise<void>;
  findById(id: string): Promise<StoredRefreshToken | null>;
  revoke(id: string, at: Date): Promise<void>;
  revokeAllForUser(userId: string, at: Date): Promise<void>;
}
