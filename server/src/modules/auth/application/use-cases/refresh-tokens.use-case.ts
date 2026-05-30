import { Inject, Injectable } from '@nestjs/common';
import { toPublic } from '../../domain/entities/auth-user.entity';
import {
  RefreshTokenInvalidError,
  UserInactiveError,
} from '../../domain/errors/auth.errors';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository.port';
import { TOKEN_ISSUER, type TokenIssuer } from '../../domain/ports/token-issuer.port';
import { USER_READER, type UserReader } from '../../domain/ports/user-reader.port';
import type { AuthSessionOutput } from '../dto/auth-session.output';
import { hashRefresh } from './login.use-case';

export interface RefreshInput {
  refreshToken: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

@Injectable()
export class RefreshTokensUseCase {
  constructor(
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
    @Inject(USER_READER) private readonly users: UserReader,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshRepo: RefreshTokenRepository,
  ) {}

  /**
   * Rota el refresh token: revoca el actual y emite uno nuevo.
   * Si el token no existe, está revocado o expirado → falla.
   */
  async execute(input: RefreshInput): Promise<AuthSessionOutput> {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.tokens.verifyRefresh(input.refreshToken);
    } catch (e) {
      throw new RefreshTokenInvalidError('firma o expiración inválida');
    }

    const stored = await this.refreshRepo.findById(payload.jti);
    if (!stored) throw new RefreshTokenInvalidError('no encontrado');
    if (stored.revokedAt) throw new RefreshTokenInvalidError('revocado');
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new RefreshTokenInvalidError('expirado');
    }
    if (stored.tokenHash !== hashRefresh(input.refreshToken)) {
      throw new RefreshTokenInvalidError('hash no coincide');
    }
    if (stored.userId !== payload.sub) {
      throw new RefreshTokenInvalidError('sub no coincide');
    }

    const user = await this.users.findById(payload.sub);
    if (!user) throw new RefreshTokenInvalidError('usuario no existe');
    if (!user.isActive) throw new UserInactiveError();

    // Rotación: revoca el actual y emite uno nuevo
    await this.refreshRepo.revoke(stored.id, new Date());

    const issued = await this.tokens.issue({
      sub: user.id,
      username: user.username,
      roles: [...user.roles],
      permissions: [...user.permissions],
    });

    await this.refreshRepo.save({
      id: issued.refreshTokenId,
      userId: user.id,
      tokenHash: hashRefresh(issued.refreshToken),
      expiresAt: issued.refreshTokenExpiresAt,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    });

    return {
      user: toPublic(user),
      accessToken: issued.accessToken,
      accessTokenExpiresInSec: issued.accessTokenExpiresInSec,
      refreshToken: issued.refreshToken,
      refreshTokenExpiresAt: issued.refreshTokenExpiresAt,
    };
  }
}
