import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Umbral configurable de descuento que requiere autorización de manager.
 * Default 15% — mismo valor que tenía la constante hardcoded antes.
 */
export class AddDiscountOverrideThreshold1700000001032
  implements MigrationInterface
{
  name = 'AddDiscountOverrideThreshold1700000001032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_settings" ADD COLUMN "discount_override_threshold_pct" numeric(5,2) NOT NULL DEFAULT 15.00`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_settings" DROP COLUMN IF EXISTS "discount_override_threshold_pct"`,
    );
  }
}
