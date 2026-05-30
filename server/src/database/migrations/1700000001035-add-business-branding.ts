import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Branding del negocio para recibos y reportes:
 *   - `logo_url` — URL pública de la imagen del logo (opcional). Si está
 *     presente, aparece arriba del nombre en recibos y cierres de caja.
 *   - `tagline` — eslogan corto del negocio (ej. "Soluciones integrales").
 *     Se imprime debajo del nombre, sobre la fecha.
 *
 * Ambos opcionales; cuando son null el recibo no los renderiza.
 */
export class AddBusinessBranding1700000001035 implements MigrationInterface {
  name = 'AddBusinessBranding1700000001035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_settings" ADD COLUMN "logo_url" varchar(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_settings" ADD COLUMN "tagline" varchar(180)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_settings" DROP COLUMN IF EXISTS "tagline"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_settings" DROP COLUMN IF EXISTS "logo_url"`,
    );
  }
}
