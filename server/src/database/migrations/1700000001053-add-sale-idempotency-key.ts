import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Clave de idempotencia para ventas. El cliente (POS offline) genera un UUID por
 * venta; al reintentar/sincronizar la cola, el server reconoce la clave y
 * devuelve la venta existente en vez de duplicar el cobro. Índice único parcial.
 */
export class AddSaleIdempotencyKey1700000001053 implements MigrationInterface {
  name = 'AddSaleIdempotencyKey1700000001053';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "sales" ADD COLUMN "idempotency_key" uuid`);
    await q.query(
      `CREATE UNIQUE INDEX "uq_sales_idempotency_key" ON "sales"("idempotency_key") WHERE "idempotency_key" IS NOT NULL`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "uq_sales_idempotency_key"`);
    await q.query(`ALTER TABLE "sales" DROP COLUMN IF EXISTS "idempotency_key"`);
  }
}
