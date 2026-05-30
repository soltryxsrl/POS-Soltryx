import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Notas por línea en la venta — texto libre (modificador, preferencia, instrucción).
 * Se captura desde el POS y se persiste en sale_items para que aparezca en el
 * recibo y en el detalle de la venta. No afecta el cálculo de totales.
 */
export class AddSaleItemNotes1700000001029 implements MigrationInterface {
  name = 'AddSaleItemNotes1700000001029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sale_items" ADD COLUMN "notes" varchar(200)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sale_items" DROP COLUMN IF EXISTS "notes"`,
    );
  }
}
