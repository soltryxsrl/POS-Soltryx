import { Inject, Injectable } from '@nestjs/common';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository.port';
import { TOKEN_ISSUER, type TokenIssuer } from '../../domain/ports/token-issuer.port';

export interface LogoutInput {
  refreshToken?: string | null;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshRepo: RefreshTokenRepository,
  ) {}

  /**
   * Revoca el refresh token actual. Si no hay cookie o es inválido,
   * el logout es idempotente — no falla.
   */
  async execute(input: LogoutInput): Promise<void> {
    if (!input.refreshToken) return;
    try {
      const payload = await this.tokens.verifyRefresh(input.refreshToken);
      await this.refreshRepo.revoke(payload.jti, new Date());
    } catch {
      // token corrupto/expirado — nada que hacer
    }
  }
}
