import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marca productos que se venden por peso (víveres, carnicería, embutidos).
 * El POS muestra la unidad "kg" y el cajero teclea cantidades decimales.
 * No cambia el cálculo — la cantidad ya soporta 3 decimales.
 */
export class AddProductSoldByWeight1700000001041 implements MigrationInterface {
  name = 'AddProductSoldByWeight1700000001041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN "sold_by_weight" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "sold_by_weight"`,
    );
  }
}
