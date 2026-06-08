import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { UploadsController } from './uploads.controller';

/**
 * Tope DURO de tamaño por subida. multer aborta el stream al superarlo, así que
 * acota la memoria por request (cortafuegos anti-OOM) en vez de bufferizar todo
 * y rechazar después. Está por encima de STORAGE_MAX_UPLOAD_BYTES (el chequeo
 * fino y configurable, con mensaje claro, vive en el controller).
 */
const MULTER_HARD_CAP_BYTES = 15 * 1024 * 1024;

/**
 * Almacén de objetos (CDN). Expone POST /uploads/image y el StorageService
 * (inyectable por otros módulos que necesiten subir archivos).
 */
@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: MULTER_HARD_CAP_BYTES, files: 1 },
    }),
  ],
  controllers: [UploadsController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
