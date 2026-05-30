import * as path from 'node:path';
import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { AppEnv } from './env.validation';

export const typeOrmAsyncConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppEnv, true>): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: config.get('DB_HOST', { infer: true }),
    port: config.get('DB_PORT', { infer: true }),
    username: config.get('DB_USER', { infer: true }),
    password: config.get('DB_PASSWORD', { infer: true }),
    database: config.get('DB_NAME', { infer: true }),
    schema: config.get('DB_SCHEMA', { infer: true }),
    autoLoadEntities: true,
    synchronize: false,
    // Fuerza la zona horaria de la sesión Postgres. Crítico para que
    // `created_at::date` en reportes use la fecha LOCAL del negocio y no UTC.
    extra: {
      options: `-c timezone=${config.get('TZ', { infer: true })}`,
    },
    // Aplica migraciones pendientes en cada arranque del API.
    // En dev: cómodo para clonar el repo en otra PC y arrancar sin pasos extra.
    // En prod: revisar si prefieres correr migraciones como step separado de deploy.
    migrationsRun: true,
    migrations: [
      // dev (ts-node): src/database/migrations/*.ts
      // prod (compiled): dist/database/migrations/*.js
      path.join(__dirname, '..', 'database', 'migrations', '*.{ts,js}'),
    ],
    migrationsTableName: 't1et_migrations',
    logging:
      config.get('NODE_ENV', { infer: true }) === 'development' ? ['error', 'warn'] : ['error'],
  }),
};
