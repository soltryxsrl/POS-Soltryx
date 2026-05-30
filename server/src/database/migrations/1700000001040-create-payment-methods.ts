import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Catálogo de Formas de pago.
 *
 * `code` ES la clase de comportamiento (CASH/CARD/TRANSFER/ACCOUNT/OTHER) que
 * maneja la lógica de caja (arqueo), crédito (CxC) y reportes. El catálogo solo
 * controla la PRESENTACIÓN en el POS: nombre visible, si pide referencia, cuáles
 * están activas, el orden y cuál es la predeterminada. Por eso `code` está
 * restringido a las 5 clases conocidas — no se inventan clases nuevas porque la
 * lógica del sistema no sabría cómo tratarlas.
 *
 * Se siembra desde run-seed.ts (UPSERT que preserva activo/default/orden).
 */
export class CreatePaymentMethods1700000001040 implements MigrationInterface {
  name = 'CreatePaymentMethods1700000001040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_methods" (
        "code"               varchar(16) PRIMARY KEY,
        "name"               varchar(60)  NOT NULL,
        "requires_reference" boolean      NOT NULL DEFAULT false,
        "is_active"          boolean      NOT NULL DEFAULT true,
        "is_default"         boolean      NOT NULL DEFAULT false,
        "sort_order"         int          NOT NULL DEFAULT 0,
        "created_at"         timestamptz  NOT NULL DEFAULT now(),
        "updated_at"         timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "ck_payment_methods_code"
          CHECK ("code" IN ('CASH', 'CARD', 'TRANSFER', 'ACCOUNT', 'OTHER'))
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ux_payment_methods_default" ON "payment_methods" ("is_default") WHERE "is_default" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "ux_payment_methods_default"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_methods"`);
  }
}
