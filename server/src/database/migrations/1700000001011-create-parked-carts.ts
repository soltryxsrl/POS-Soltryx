import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Carritos en espera ("park sale" / "guardar para después").
 *
 * Modelo: NO se crea una sale fiscal en este momento — solo se serializa el
 * carrito (items + descuento orden + meta) para retomarlo después. No
 * consume sale_number, no afecta stock, no aparece en reportes de ventas.
 *
 * Cuando el cajero "retoma", se borra la fila y los items vuelven al carrito
 * del POS; al cobrar se crea una sale normalmente.
 */
export class CreateParkedCarts1700000001011 implements MigrationInterface {
  name = 'CreateParkedCarts1700000001011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "parked_carts" (
        "id"              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"         uuid          NOT NULL,
        "cash_session_id" uuid          NOT NULL,
        "customer_id"     uuid,
        "label"           varchar(120),
        "notes"           text,
        "payload"         jsonb         NOT NULL,
        "created_at"      timestamptz   NOT NULL DEFAULT now(),
        "updated_at"      timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "fk_pc_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_pc_session" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_pc_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_parked_carts_user_session" ON "parked_carts"("user_id", "cash_session_id", "created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "parked_carts"`);
  }
}
