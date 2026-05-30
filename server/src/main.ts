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

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
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

  const port = config.get('API_PORT', { infer: true });
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
