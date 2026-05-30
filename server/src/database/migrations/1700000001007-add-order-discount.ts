import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega columna order_discount a sales.
 *
 * Modelo: descuento global post-impuesto. Cada línea conserva su descuento
 * individual (sale_items.discount), el calculator suma ITBIS sobre la base
 * por-línea, y luego order_discount se resta del total.
 *
 *   total = subtotal − discount_total + tax_total − order_discount
 */
export class AddOrderDiscount1700000001007 implements MigrationInterface {
  name = 'AddOrderDiscount1700000001007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales" ADD COLUMN "order_discount" numeric(12,2) NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN "order_discount"`);
  }
}
