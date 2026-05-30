import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-currency: catálogo de monedas + tasas de cambio + soporte en payments.
 *
 * Diseño:
 *   - DOP es la moneda base del sistema (no cambia). Todo monto canónico de la
 *     venta (`sale.total`, `subtotal`, etc.) se guarda en DOP.
 *   - Tenders pueden venir en otras monedas (USD, EUR). En payments guardamos
 *     el monto ORIGINAL en la moneda del cliente + la tasa que se aplicó +
 *     el monto convertido a DOP (base) para que la suma cuadre con la venta.
 *   - El cajero solo necesita saber la tasa actual; el server hace la conversión.
 *
 * Ejemplo: cliente paga USD$30 cuando la tasa es 60.00 →
 *   payment.amount_base = 1800.00 (DOP)
 *   payment.currency_code = 'USD'
 *   payment.foreign_amount = 30.00
 *   payment.exchange_rate = 60.00
 */
export class CreateCurrencies1700000001023 implements MigrationInterface {
  name = 'CreateCurrencies1700000001023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "currencies" (
        "code"      varchar(3)   PRIMARY KEY,
        "name"      varchar(60)  NOT NULL,
        "symbol"    varchar(8)   NOT NULL,
        "decimals"  int          NOT NULL DEFAULT 2,
        "is_active" boolean      NOT NULL DEFAULT true,
        "is_base"   boolean      NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    // Solo una moneda puede ser base
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_currencies_one_base" ON "currencies" ("is_base") WHERE "is_base" = true`,
    );

    // Insertar DOP como base antes de crear FK desde payments — el seed
    // luego puede re-aplicar nombre/símbolo si fuera necesario.
    await queryRunner.query(
      `INSERT INTO "currencies" ("code", "name", "symbol", "decimals", "is_active", "is_base")
       VALUES ('DOP', 'Peso Dominicano', 'RD$', 2, true, true)
       ON CONFLICT ("code") DO NOTHING`,
    );

    // Tasa de cambio actual (a base). Histórico vía updated_at.
    // Para v1 mantenemos UN row por moneda no-base.
    await queryRunner.query(`
      CREATE TABLE "exchange_rates" (
        "currency_code"  varchar(3)    PRIMARY KEY,
        "rate_to_base"   numeric(14,6) NOT NULL,
        "updated_at"     timestamptz   NOT NULL DEFAULT now(),
        "updated_by_id"  uuid,
        CONSTRAINT "fk_er_currency"   FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE CASCADE,
        CONSTRAINT "fk_er_updated_by" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "ck_er_rate_positive" CHECK ("rate_to_base" > 0)
      )
    `);

    // payments: agregar campos para tender en moneda extranjera
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN "currency_code" varchar(3) NOT NULL DEFAULT 'DOP'`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN "foreign_amount" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN "exchange_rate" numeric(14,6)`,
    );
    // FK a currencies (NO RESTRICT delete — currencies pueden archivarse)
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_currency" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT`,
    );
    // Si moneda != base, foreign_amount y exchange_rate son obligatorios
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "ck_payments_foreign_coherent" CHECK (
        ("currency_code" = 'DOP' AND "foreign_amount" IS NULL AND "exchange_rate" IS NULL)
        OR ("currency_code" <> 'DOP' AND "foreign_amount" IS NOT NULL AND "exchange_rate" IS NOT NULL)
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "ck_payments_foreign_coherent"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "fk_payments_currency"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "exchange_rate"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "foreign_amount"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "currency_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exchange_rates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "currencies"`);
  }
}
