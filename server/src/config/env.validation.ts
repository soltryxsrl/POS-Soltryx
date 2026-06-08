import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TZ: z.string().default('America/Santo_Domingo'),

  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3001),

  // Si está presente (Render/Railway) tiene prioridad sobre las DB_* sueltas.
  DATABASE_URL: z.string().optional(),
  DB_SSL: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === 'string' ? v === 'true' : v))
    .default(false),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5433),
  DB_NAME: z.string().min(1).default('t1et_pos'),
  DB_USER: z.string().min(1).default('t1et_app'),
  DB_PASSWORD: z.string().min(1).default('postgres'),
  DB_SCHEMA: z.string().default('public'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Observabilidad (opcional): si SENTRY_DSN está vacío, Sentry queda inactivo.
  SENTRY_DSN: z.string().default(''),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),

  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  COOKIE_DOMAIN: z.string().default(''),
  COOKIE_SECURE: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === 'string' ? v === 'true' : v))
    .default(false),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  // Super-admin (Soltryx). Deben declararse aquí o la validación Zod las elimina
  // de process.env (safeParse descarta claves desconocidas). Si SUPERADMIN_SECRET
  // queda vacío, el cambio de plan por UI queda deshabilitado (se usa SQL).
  SUPERADMIN_SECRET: z.string().default(''),
  SUPERADMIN_EMAIL: z.string().optional(),
  SUPERADMIN_PASSWORD: z.string().optional(),
  SUPERADMIN_USERNAME: z.string().optional(),

  // --- Almacenamiento de objetos (MinIO en dev; S3/R2/Spaces en prod) ---
  // El módulo storage sube las imágenes aquí y guarda en BD la URL pública.
  STORAGE_ENDPOINT: z.string().default('http://localhost:9000'),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_ACCESS_KEY: z.string().default('minioadmin'),
  STORAGE_SECRET_KEY: z.string().default('minioadmin123'),
  STORAGE_BUCKET: z.string().default('t1et-media'),
  // Base pública con la que se construye la URL final: `${BASE}/${key}`.
  // En prod apunta al dominio del CDN/bucket público.
  STORAGE_PUBLIC_BASE_URL: z.string().default('http://localhost:9000/t1et-media'),
  // MinIO y otros requieren path-style (bucket en el path, no subdominio).
  STORAGE_FORCE_PATH_STYLE: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === 'string' ? v === 'true' : v))
    .default(true),
  // Tamaño máximo de subida en bytes (default 5 MB).
  STORAGE_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(5_242_880),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Variables de entorno inválidas:\n${issues}`);
  }
  return parsed.data;
}
