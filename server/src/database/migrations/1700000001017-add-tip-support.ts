import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Soporte para propinas en ventas + setting de propina por defecto.
 *
 * - `sales.tip_total`: monto de propina cobrado en la venta, separado del total ITBIS.
 *   Total final = subtotal − discount_total + tax_total − order_discount + tip_total
 * - `business_settings.tip_enabled` y `tip_default_pct`: para sugerir % al cobrar.
 *
 * Nota legal RD (Ley 16-92 art. 228): la propina del 10% es obligatoria solo en
 * consumo dentro del establecimiento (food & beverage). Esta funcionalidad deja
 * el control al usuario para activarla y elegir el porcentaje.
 */
export class AddTipSupport1700000001017 implements MigrationInterface {
  name = 'AddTipSupport1700000001017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales" ADD COLUMN "tip_total" numeric(12,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_settings" ADD COLUMN "tip_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_settings" ADD COLUMN "tip_default_pct" numeric(5,2) NOT NULL DEFAULT 10`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN "tip_total"`);
    await queryRunner.query(`ALTER TABLE "business_settings" DROP COLUMN "tip_default_pct"`);
    await queryRunner.query(`ALTER TABLE "business_settings" DROP COLUMN "tip_enabled"`);
  }
}
