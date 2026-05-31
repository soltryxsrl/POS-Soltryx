import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { SentryExceptionFilter } from './common/observability/sentry-exception.filter';
import { initSentry } from './common/observability/sentry';
import type { AppEnv } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService<AppEnv, true>);

  // Observabilidad: activa Sentry si hay DSN (no-op en local). Reporta 5xx.
  const sentryOn = initSentry({
    dsn: config.get('SENTRY_DSN', { infer: true }),
    environment: config.get('NODE_ENV', { infer: true }),
    tracesSampleRate: config.get('SENTRY_TRACES_SAMPLE_RATE', { infer: true }),
  });
  if (sentryOn) Logger.log('Sentry habilitado', 'Observability');
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));

  // Detrás del proxy de Railway/Vercel: confía en X-Forwarded-* para que
  // `req.ip` y la detección de HTTPS (cookies secure) funcionen bien.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(helmet());
  app.use(cookieParser());

  // CORS: orígenes exactos (WEB_ORIGIN, lista por comas) + patrones de Vercel
  // del proyecto, para que cada deploy/preview con hash funcione sin reconfigurar.
  const webOrigin = config.get('WEB_ORIGIN', { infer: true });
  const exactOrigins = new Set(
    webOrigin.split(',').map((o) => o.trim()).filter(Boolean),
  );
  // Cualquier subdominio Vercel del proyecto: pos-soltryx*.vercel.app y
  // los alias con scope del equipo (...-soltryx-s-projects.vercel.app).
  const vercelPatterns = [
    /^https:\/\/pos-soltryx[a-z0-9-]*\.vercel\.app$/,
    /^https:\/\/[a-z0-9-]+-soltryx-s-projects\.vercel\.app$/,
  ];
  app.enableCors({
    origin: (origin, cb) => {
      // Sin Origin (curl, server-to-server, same-origin) → permitir.
      if (!origin) return cb(null, true);
      if (exactOrigins.has(origin)) return cb(null, true);
      if (vercelPatterns.some((re) => re.test(origin))) return cb(null, true);
      return cb(null, false); // no permitido: sin ACAO, el navegador lo bloquea
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api', { exclude: ['health'] });

  // Railway/Render inyectan PORT — tiene prioridad sobre API_PORT.
  const port = process.env.PORT ? Number(process.env.PORT) : config.get('API_PORT', { infer: true });
  const host = config.get('API_HOST', { infer: true });
  await app.listen(port, host);

  // eslint-disable-next-line no-console
  console.log(`[t1et-server] listening on http://${host}:${port}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[t1et-server] failed to start', err);
  process.exit(1);
});
