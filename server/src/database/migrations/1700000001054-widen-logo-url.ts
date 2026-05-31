import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El logo del negocio ahora puede subirse desde el dispositivo y se guarda como
 * un data URI (`data:image/...;base64,...`), que excede el varchar(500) original.
 * Ampliamos `business_settings.logo_url` a `text` para alojar el base64.
 *
 * down(): vuelve a varchar(500) recortando lo que exceda (sólo para revertir
 * en entornos donde no haya un logo embebido).
 */
export class WidenLogoUrl1700000001054 implements MigrationInterface {
  name = 'WidenLogoUrl1700000001054';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_settings" ALTER COLUMN "logo_url" TYPE text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_settings" ALTER COLUMN "logo_url" TYPE varchar(500) USING left("logo_url", 500)`,
    );
  }
}
