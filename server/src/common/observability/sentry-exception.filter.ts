import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { captureError } from './sentry';

/**
 * Filtro global que reporta a Sentry los errores de SERVIDOR (5xx / no-HTTP)
 * y delega el resto del manejo al filtro por defecto de Nest (extiende
 * BaseExceptionFilter, así que la respuesta al cliente no cambia). Los 4xx
 * (validación, auth, not-found) son esperados y NO se reportan.
 */
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    if (status >= 500) {
      const req = host
        .switchToHttp()
        .getRequest<{ method?: string; url?: string; user?: { id?: string } }>();
      captureError(exception, {
        method: req?.method,
        url: req?.url,
        userId: req?.user?.id ?? null,
      });
    }
    super.catch(exception, host);
  }
}
