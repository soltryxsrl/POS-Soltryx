import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Setting: permitir que el stock baje de cero al vender o ajustar.
 *
 * Default: false (comportamiento histórico — bloquea la venta si no hay stock).
 * Cuando se activa, el StockMovementRecorder permite que `new_stock` sea negativo.
 * Útil para colmados donde se "vende y luego se cuenta", o cuando el stock es
 * impreciso y el dueño prefiere registrar la venta y ajustar después.
 */
export class AddNegativeStockPolicy1700000001015 implements MigrationInterface {
  name = 'AddNegativeStockPolicy1700000001015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_settings" ADD COLUMN "allow_negative_stock" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_settings" DROP COLUMN "allow_negative_stock"`,
    );
  }
}
