import * as Sentry from '@sentry/node';

/**
 * Integración opcional con Sentry. Solo se activa si hay `SENTRY_DSN`; sin DSN
 * (dev/local) todo queda en no-op para no cambiar el comportamiento. Captura
 * errores de servidor (5xx / no manejados) para tener visibilidad en producción
 * de fallos en emisión de NCF, 606/607, pagos, etc.
 */
let enabled = false;

export function initSentry(opts: {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
}): boolean {
  if (!opts.dsn) return false;
  Sentry.init({
    dsn: opts.dsn,
    environment: opts.environment,
    tracesSampleRate: opts.tracesSampleRate,
  });
  enabled = true;
  return true;
}

export function isSentryEnabled(): boolean {
  return enabled;
}

/** Captura una excepción en Sentry (no-op si no está configurado). */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    if (context) scope.setContext('request', context);
    Sentry.captureException(error);
  });
}
