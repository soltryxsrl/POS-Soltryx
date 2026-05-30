import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pay-ins (entradas) y pay-outs (salidas) intra-turno en la caja.
 *
 * NO confundir con `stock_movements` (movimientos de inventario).
 * Esto solo modela transferencias de efectivo durante un turno abierto:
 *   - PAID_IN: aumenta el efectivo esperado en caja (apertura adicional,
 *     fondo extra, reembolso recibido de un proveedor, etc.)
 *   - PAID_OUT: disminuye el efectivo esperado (vale, pago a proveedor,
 *     pago de servicios, retiro al banco, etc.)
 *
 * El expected_amount de la sesión al cerrar es:
 *   opening + cashSales - cashRefunds + paidIns - paidOuts
 */
export class CreateCashMovements1700000001009 implements MigrationInterface {
  name = 'CreateCashMovements1700000001009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cash_movements" (
        "id"              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        "cash_session_id" uuid          NOT NULL,
        "type"            varchar(16)   NOT NULL,
        "amount"          numeric(12,2) NOT NULL,
        "reason"          varchar(255)  NOT NULL,
        "user_id"         uuid          NOT NULL,
        "created_at"      timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "fk_cm_session" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_cm_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_cm_type" CHECK ("type" IN ('PAID_IN', 'PAID_OUT')),
        CONSTRAINT "ck_cm_amount_positive" CHECK ("amount" > 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_cash_movements_session_created" ON "cash_movements"("cash_session_id", "created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cash_movements"`);
  }
}
