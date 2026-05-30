import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cuenta corriente / crédito por cliente.
 *
 * Ledger inmutable. Cada fila es un asiento:
 *   - CHARGE: la venta cargó X a la cuenta del cliente
 *     (creado automáticamente cuando una venta usa method=ACCOUNT)
 *   - PAYMENT: el cliente abonó X (cash/card/transfer recibidos contra su cuenta)
 *   - REVERSAL: se anuló una venta CHARGE previa (cancel-sale de una fiada)
 *
 * El balance del cliente es:
 *   Σ CHARGE - Σ PAYMENT - Σ REVERSAL
 *
 * (REVERSAL anula un CHARGE previo, así que efectivamente reduce la deuda.)
 */
export class CreateCustomerAccount1700000001012 implements MigrationInterface {
  name = 'CreateCustomerAccount1700000001012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "customer_account_entries" (
        "id"              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        "customer_id"     uuid          NOT NULL,
        "type"            varchar(16)   NOT NULL,
        "amount"          numeric(12,2) NOT NULL,
        "sale_id"         uuid,
        "cash_session_id" uuid,
        "payment_method"  varchar(16),
        "reference"       varchar(120),
        "notes"           text,
        "user_id"         uuid          NOT NULL,
        "created_at"      timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "fk_cae_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_cae_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_cae_session" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_cae_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_cae_type" CHECK ("type" IN ('CHARGE', 'PAYMENT', 'REVERSAL')),
        CONSTRAINT "ck_cae_amount_positive" CHECK ("amount" > 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_cae_customer_created" ON "customer_account_entries"("customer_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_cae_sale" ON "customer_account_entries"("sale_id") WHERE "sale_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_account_entries"`);
  }
}
