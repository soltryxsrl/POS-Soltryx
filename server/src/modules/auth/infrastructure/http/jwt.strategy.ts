import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AppEnv } from '../../../../config/env.validation';
import type { AccessTokenPayload } from '../../domain/ports/token-issuer.port';
import type { CurrentUserPayload } from './current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject(ConfigService) config: ConfigService<AppEnv, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  /**
   * Passport llama esto tras verificar firma+exp del JWT.
   * Lo que devuelva queda en `request.user`.
   */
  validate(payload: AccessTokenPayload): CurrentUserPayload {
    return { id: payload.sub, username: payload.username, roles: payload.roles ?? [] };
  }
}
