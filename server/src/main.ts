import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import type { AppEnv } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService<AppEnv, true>);

  // Detrás del proxy de Railway/Vercel: confía en X-Forwarded-* para que
  // `req.ip` y la detección de HTTPS (cookies secure) funcionen bien.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(helmet());
  app.use(cookieParser());

  // WEB_ORIGIN puede ser una lista separada por comas (varios previews de Vercel).
  const webOrigin = config.get('WEB_ORIGIN', { infer: true });
  const origins = webOrigin.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: origins.length === 1 ? origins[0] : origins,
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
