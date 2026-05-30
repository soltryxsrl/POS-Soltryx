import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Imagen de producto opcional por URL pública (Cloudinary, Imgur, CDN propio).
 * Sin upload local — el cliente pega una URL en el formulario de producto.
 * Si más adelante introducimos upload propio, esta columna sigue válida apuntando
 * a un endpoint de archivos servidos por el server.
 */
export class AddProductImageUrl1700000001028 implements MigrationInterface {
  name = 'AddProductImageUrl1700000001028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN "image_url" varchar(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "image_url"`,
    );
  }
}
