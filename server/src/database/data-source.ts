import 'reflect-metadata';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { validateEnv } from '../config/env.validation';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const env = validateEnv(process.env);

const conn = env.DATABASE_URL
  ? { url: env.DATABASE_URL }
  : {
      host: env.DB_HOST,
      port: env.DB_PORT,
      username: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
    };

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  ...conn,
  ...(env.DB_SSL ? { ssl: { rejectUnauthorized: false } } : {}),
  schema: env.DB_SCHEMA,
  entities: [
    path.join(__dirname, '..', 'modules', '**', '*.orm-entity.{ts,js}'),
    path.join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}'),
  ],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 't1et_migrations',
  synchronize: false,
  logging: ['error', 'warn'],
};

export const AppDataSource = new DataSource(dataSourceOptions);
