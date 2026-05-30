import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type {
  AccessTokenPayload,
  IssuedTokens,
  RefreshTokenPayload,
  TokenIssuer,
} from '../../domain/ports/token-issuer.port';
import type { AppEnv } from '../../../../config/env.validation';

/**
 * Parsea cadenas como "15m", "7d", "3600s" a segundos.
 * Suficiente para los formatos que aceptamos en `.env`.
 */
function parseDurationToSeconds(d: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(d.trim());
  if (!match) {
    const asNum = Number(d);
    if (!Number.isNaN(asNum) && asNum > 0) return asNum;
    throw new Error(`Duración inválida: ${d}`);
  }
  const n = Number(match[1]);
  const unit = match[2];
  const mult = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return n * mult;
}

@Injectable()
export class JwtTokenIssuer implements TokenIssuer {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresInSec: number;
  private readonly refreshExpiresInSec: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.accessSecret = config.get('JWT_ACCESS_SECRET', { infer: true });
    this.refreshSecret = config.get('JWT_REFRESH_SECRET', { infer: true });
    this.accessExpiresInSec = parseDurationToSeconds(
      config.get('JWT_ACCESS_EXPIRES_IN', { infer: true }),
    );
    this.refreshExpiresInSec = parseDurationToSeconds(
      config.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),
    );
  }

  async issue(payload: {
    sub: string;
    username: string;
    roles: string[];
    permissions: string[];
  }): Promise<IssuedTokens> {
    const refreshTokenId = randomUUID();

    const accessToken = await this.jwt.signAsync(
      {
        sub: payload.sub,
        username: payload.username,
        roles: payload.roles,
        permissions: payload.permissions,
      },
      { secret: this.accessSecret, expiresIn: this.accessExpiresInSec },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: payload.sub, jti: refreshTokenId },
      { secret: this.refreshSecret, expiresIn: this.refreshExpiresInSec },
    );

    return {
      accessToken,
      refreshToken,
      refreshTokenId,
      accessTokenExpiresInSec: this.accessExpiresInSec,
      refreshTokenExpiresAt: new Date(Date.now() + this.refreshExpiresInSec * 1000),
    };
  }

  async verifyAccess(token: string): Promise<AccessTokenPayload> {
    const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
      secret: this.accessSecret,
    });
    return payload;
  }

  async verifyRefresh(token: string): Promise<RefreshTokenPayload> {
    const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
      secret: this.refreshSecret,
    });
    return payload;
  }
}
