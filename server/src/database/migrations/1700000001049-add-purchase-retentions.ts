import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retenciones del comprobante de compra → alimentan las columnas del 606:
 *   - col 12 "ITBIS Retenido"        ← itbis_retenido
 *   - col 17 "Tipo de Retención ISR" ← isr_retention_type (código DGII 01..08)
 *   - col 18 "Monto Retención Renta" ← isr_retenido
 * Aplica cuando el negocio es agente de retención (servicios, informales, etc.).
 * Montos manuales (el contador conoce lo retenido). Default 0 / null.
 */
export class AddPurchaseRetentions1700000001049 implements MigrationInterface {
  name = 'AddPurchaseRetentions1700000001049';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "purchase_orders" ADD COLUMN "itbis_retenido" numeric(12,2) NOT NULL DEFAULT 0`,
    );
    await q.query(
      `ALTER TABLE "purchase_orders" ADD COLUMN "isr_retenido" numeric(12,2) NOT NULL DEFAULT 0`,
    );
    await q.query(
      `ALTER TABLE "purchase_orders" ADD COLUMN "isr_retention_type" varchar(2)`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "isr_retention_type"`);
    await q.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "isr_retenido"`);
    await q.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "itbis_retenido"`);
  }
}
