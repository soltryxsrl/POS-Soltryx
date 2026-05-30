import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { toPublic } from '../../domain/entities/auth-user.entity';
import {
  InvalidCredentialsError,
  UserInactiveError,
} from '../../domain/errors/auth.errors';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../domain/ports/password-hasher.port';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository.port';
import { TOKEN_ISSUER, type TokenIssuer } from '../../domain/ports/token-issuer.port';
import { USER_READER, type UserReader } from '../../domain/ports/user-reader.port';
import type { AuthSessionOutput } from '../dto/auth-session.output';

export interface LoginInput {
  emailOrUsername: string;
  password: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_READER) private readonly users: UserReader,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshRepo: RefreshTokenRepository,
  ) {}

  async execute(input: LoginInput): Promise<AuthSessionOutput> {
    const user = await this.users.findByEmailOrUsername(input.emailOrUsername);
    if (!user) throw new InvalidCredentialsError();

    const ok = await this.hasher.verify(input.password, user.passwordHash);
    if (!ok) throw new InvalidCredentialsError();

    if (!user.isActive) throw new UserInactiveError();

    const issued = await this.tokens.issue({
      sub: user.id,
      username: user.username,
      roles: [...user.roles],
    });

    await this.refreshRepo.save({
      id: issued.refreshTokenId,
      userId: user.id,
      tokenHash: hashRefresh(issued.refreshToken),
      expiresAt: issued.refreshTokenExpiresAt,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    });

    await this.users.markLogin(user.id, new Date());

    return {
      user: toPublic(user),
      accessToken: issued.accessToken,
      accessTokenExpiresInSec: issued.accessTokenExpiresInSec,
      refreshToken: issued.refreshToken,
      refreshTokenExpiresAt: issued.refreshTokenExpiresAt,
    };
  }
}

/**
 * SHA-256 del refresh token plano. Lo que guardamos en DB.
 * Si la DB se compromete, el atacante no puede usar los tokens directamente.
 */
export function hashRefresh(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
