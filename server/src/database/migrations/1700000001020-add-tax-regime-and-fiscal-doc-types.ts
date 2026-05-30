import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fundación del módulo Fiscal RD:
 *   1) business_settings.tax_regime: ORDINARIO o RST (Régimen Simplificado).
 *      Cuando es RST, la UI esconde 606/607 (esos contribuyentes no declaran).
 *   2) fiscal_doc_types: catálogo de tipos DGII (E31...E45). Sembrado por seed.
 *      `is_active` permite que el dueño escoja cuáles usar (E32/E31 típicamente
 *      sí; E44/E45 no aplican a la mayoría de comercios).
 *
 * NO modifica las 4 tablas fiscales existentes — esas viven desde la
 * migración 1004 y son suficientes.
 */
export class AddTaxRegimeAndFiscalDocTypes1700000001020 implements MigrationInterface {
  name = 'AddTaxRegimeAndFiscalDocTypes1700000001020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_settings" ADD COLUMN "tax_regime" varchar(16) NOT NULL DEFAULT 'ORDINARIO'`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_settings" ADD CONSTRAINT "ck_business_tax_regime" CHECK ("tax_regime" IN ('ORDINARIO', 'RST'))`,
    );

    await queryRunner.query(`
      CREATE TABLE "fiscal_doc_types" (
        "code"                  varchar(4)   PRIMARY KEY,
        "name"                  varchar(120) NOT NULL,
        "description"           varchar(255),
        "is_active"             boolean      NOT NULL DEFAULT true,
        "requires_buyer_rnc"    boolean      NOT NULL DEFAULT false,
        "applies_to"            varchar(16)  NOT NULL DEFAULT 'SALE',
        "created_at"            timestamptz  NOT NULL DEFAULT now(),
        "updated_at"            timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "ck_fdt_applies_to" CHECK ("applies_to" IN ('SALE', 'PURCHASE', 'BOTH'))
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_doc_types"`);
    await queryRunner.query(
      `ALTER TABLE "business_settings" DROP CONSTRAINT IF EXISTS "ck_business_tax_regime"`,
    );
    await queryRunner.query(`ALTER TABLE "business_settings" DROP COLUMN IF EXISTS "tax_regime"`);
  }
}
