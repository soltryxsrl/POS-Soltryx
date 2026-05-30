import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Modo "precio con ITBIS incluido" (norma del retail RD).
 *
 *   1) business_settings.price_includes_tax: ajuste global. Cuando es true, los
 *      precios de venta YA incluyen el ITBIS; el sistema lo back-calcula en vez
 *      de agregarlo por encima.
 *   2) sales.price_includes_tax: snapshot por venta del modo vigente al cobrar,
 *      para que el recibo histórico se etiquete correcto aunque el ajuste global
 *      cambie después.
 *
 * Default false en ambos para preservar el comportamiento tax-exclusive previo.
 */
export class AddPriceIncludesTax1700000001039 implements MigrationInterface {
  name = 'AddPriceIncludesTax1700000001039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_settings" ADD COLUMN "price_includes_tax" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" ADD COLUMN "price_includes_tax" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales" DROP COLUMN IF EXISTS "price_includes_tax"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_settings" DROP COLUMN IF EXISTS "price_includes_tax"`,
    );
  }
}
