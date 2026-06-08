import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import type { AppEnv } from '../../config/env.validation';

/** Extensión por mimetype. Lo desconocido cae a `bin` (no debería pasar: el
 *  controller ya filtra los tipos permitidos antes de llamar a upload). */
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export interface UploadInput {
  buffer: Buffer;
  mimetype: string;
}

/**
 * Almacén de objetos S3-compatible. En dev apunta a MinIO (docker-compose);
 * en prod, a S3/Cloudflare R2/DO Spaces — solo cambian las STORAGE_* del .env.
 *
 * Guarda el archivo y devuelve la URL pública absoluta (`${PUBLIC_BASE}/${key}`),
 * que es lo que se persiste en `products.image_url` / `business.logo_url`. Así
 * ningún read-path necesita transformar la key, y las URLs externas o data-URIs
 * previos siguen siendo válidos sin migración.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService<AppEnv, true>) {
    this.bucket = config.get('STORAGE_BUCKET', { infer: true });
    this.publicBaseUrl = config
      .get('STORAGE_PUBLIC_BASE_URL', { infer: true })
      .replace(/\/$/, '');
    this.client = new S3Client({
      endpoint: config.get('STORAGE_ENDPOINT', { infer: true }),
      region: config.get('STORAGE_REGION', { infer: true }),
      credentials: {
        accessKeyId: config.get('STORAGE_ACCESS_KEY', { infer: true }),
        secretAccessKey: config.get('STORAGE_SECRET_KEY', { infer: true }),
      },
      forcePathStyle: config.get('STORAGE_FORCE_PATH_STYLE', { infer: true }),
    });
  }

  /**
   * Idempotente: crea el bucket si falta y lo deja con lectura pública (para
   * servir como CDN). No tumba el arranque si el almacén está caído en dev —
   * solo advierte; las subidas fallarán con un error claro hasta que esté arriba.
   */
  async onModuleInit(): Promise<void> {
    // El bootstrap (crear bucket + política de lectura pública) es para dev/MinIO.
    // En producción NO lo ejecutamos: el bucket y su CDN se provisionan por infra
    // (IaC) con mínimo privilegio. Así el app server nunca hace público un bucket
    // real ni pisa un "Block Public Access" intencional en cada arranque.
    if (this.config.get('NODE_ENV', { infer: true }) === 'production') {
      this.logger.log(
        'Bootstrap de storage omitido en producción (provisiona bucket/CDN por infra).',
      );
      return;
    }
    let exists = false;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      exists = true;
    } catch {
      exists = false;
    }
    if (!exists) {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket "${this.bucket}" creado`);
      } catch (err) {
        const name = (err as { name?: string })?.name;
        if (name !== 'BucketAlreadyOwnedByYou' && name !== 'BucketAlreadyExists') {
          this.logger.warn(
            `No se pudo preparar el bucket "${this.bucket}": ${(err as Error).message}. ` +
              `¿Está MinIO arriba? (docker compose up -d minio)`,
          );
          return;
        }
      }
    }
    // Política de solo-lectura pública sobre los objetos del bucket.
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        },
      ],
    };
    try {
      await this.client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucket,
          Policy: JSON.stringify(policy),
        }),
      );
    } catch (err) {
      this.logger.warn(
        `No se pudo fijar la política pública del bucket: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Sube un archivo bajo `folder/<uuid>.<ext>` y devuelve la URL pública.
   * `folder` agrupa por recurso (p.ej. "products", "business").
   */
  async upload(file: UploadInput, folder: string): Promise<string> {
    const ext = EXT_BY_MIME[file.mimetype] ?? 'bin';
    const key = `${folder}/${randomUUID()}.${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Inmutable: la key lleva un uuid, así que el contenido nunca cambia.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return `${this.publicBaseUrl}/${key}`;
  }
}
