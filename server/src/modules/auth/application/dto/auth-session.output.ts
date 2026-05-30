import type { AuthUserPublic } from '../../domain/entities/auth-user.entity';

/**
 * Lo que devuelve el use case de Login/Refresh.
 * El controller decide cómo entregarlo al cliente:
 *   - `accessToken` en el body
 *   - `refreshToken` en cookie httpOnly (no se serializa al cliente JS)
 */
export interface AuthSessionOutput {
  user: AuthUserPublic;
  accessToken: string;
  accessTokenExpiresInSec: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}
