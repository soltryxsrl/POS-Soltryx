import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Catálogo de Tipos de ITBIS (tasas de impuesto RD).
 *
 * Tasas legales DGII: 18% (general), 16% (reducida), 0% (tasa cero) y Exento.
 * Se siembra desde run-seed.ts (UPSERT). El dueño activa/desactiva cuáles usar
 * y marca el `is_default` que se aplica a productos nuevos. La tasa es un valor
 * legal — el mantenimiento no expone rates arbitrarios.
 *
 * `is_exempt` distingue "Exento" (fuera del ámbito del ITBIS) de "Tasa cero"
 * (gravado a 0%). Ambos rate=0 pero se reportan distinto en 606/607.
 */
export class CreateTaxTypes1700000001037 implements MigrationInterface {
  name = 'CreateTaxTypes1700000001037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tax_types" (
        "code"        varchar(16)  PRIMARY KEY,
        "name"        varchar(80)  NOT NULL,
        "rate"        numeric(5,2) NOT NULL DEFAULT 0,
        "is_exempt"   boolean      NOT NULL DEFAULT false,
        "is_active"   boolean      NOT NULL DEFAULT true,
        "is_default"  boolean      NOT NULL DEFAULT false,
        "sort_order"  int          NOT NULL DEFAULT 0,
        "created_at"  timestamptz  NOT NULL DEFAULT now(),
        "updated_at"  timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "ck_tax_types_rate" CHECK ("rate" >= 0 AND "rate" <= 100)
      )
    `);
    // Solo un tipo puede ser el default (índice único parcial).
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ux_tax_types_default" ON "tax_types" ("is_default") WHERE "is_default" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "ux_tax_types_default"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tax_types"`);
  }
}
