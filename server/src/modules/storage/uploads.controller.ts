import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Roles } from '../auth/infrastructure/http/roles.decorator';
import type { AppEnv } from '../../config/env.validation';
import { StorageService } from './storage.service';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
/** Carpetas (prefijos) permitidas. Evita que el cliente escriba en rutas arbitrarias. */
const ALLOWED_FOLDERS = new Set(['products', 'business']);

/**
 * Subida de imágenes al almacén de objetos (CDN). Devuelve la URL pública para
 * persistirla luego en el recurso (producto, negocio). Solo ADMIN/MANAGER — el
 * JwtAuthGuard global ya exige sesión; esto acota quién puede escribir media.
 */
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly storage: StorageService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  @Post('image')
  @Roles('ADMIN', 'MANAGER')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('folder') folder?: string,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo (campo "file").');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Formato no permitido. Usa PNG, JPG, WEBP o GIF.',
      );
    }
    const max = this.config.get('STORAGE_MAX_UPLOAD_BYTES', { infer: true });
    if (file.size > max) {
      throw new BadRequestException(
        `La imagen supera el máximo permitido (${Math.round(max / 1024 / 1024)} MB).`,
      );
    }
    const dest = folder && ALLOWED_FOLDERS.has(folder) ? folder : 'products';
    const url = await this.storage.upload(file, dest);
    return { url };
  }
}
