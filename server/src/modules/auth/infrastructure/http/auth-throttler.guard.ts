import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate-limit de los endpoints públicos de auth (login/refresh) que SOLO aplica
 * en producción. El brute force es una amenaza real contra la API expuesta de
 * Render; en dev/test no, y el fixture de e2e se autentica decenas de veces
 * desde la misma IP (un login por test), lo que dispararía el 429 y haría
 * fallar toda la suite. Gating por NODE_ENV: protegido en prod, transparente
 * en local.
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected override shouldSkip(): Promise<boolean> {
    return Promise.resolve(process.env.NODE_ENV !== 'production');
  }
}
