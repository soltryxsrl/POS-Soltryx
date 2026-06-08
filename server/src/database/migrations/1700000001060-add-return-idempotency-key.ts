import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Clave de idempotencia para devoluciones. El cliente genera un UUID por intento
 * de devolución; si el endpoint se reintenta (doble-click / retry de red), el
 * server reconoce la clave y devuelve la devolución existente en vez de duplicar
 * el reembolso, el movimiento de stock y la nota de crédito. Índice único parcial.
 */
export class AddReturnIdempotencyKey1700000001060 implements MigrationInterface {
  name = 'AddReturnIdempotencyKey1700000001060';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "sale_returns" ADD COLUMN "idempotency_key" uuid`);
    await q.query(
      `CREATE UNIQUE INDEX "uq_sale_returns_idempotency_key" ON "sale_returns"("idempotency_key") WHERE "idempotency_key" IS NOT NULL`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "uq_sale_returns_idempotency_key"`);
    await q.query(`ALTER TABLE "sale_returns" DROP COLUMN IF EXISTS "idempotency_key"`);
  }
}
