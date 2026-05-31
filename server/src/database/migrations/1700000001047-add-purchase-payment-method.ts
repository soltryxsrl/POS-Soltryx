import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Forma de pago de la orden de compra → alimenta la columna 23 "Forma de Pago"
 * del reporte 606 (antes hardcodeada a '01' efectivo). Nullable: las órdenes
 * existentes (null) se reportan como efectivo ('01') por compatibilidad.
 */
export class AddPurchasePaymentMethod1700000001047 implements MigrationInterface {
  name = 'AddPurchasePaymentMethod1700000001047';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "purchase_orders" ADD COLUMN "payment_method" varchar(16)`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "payment_method"`,
    );
  }
}
