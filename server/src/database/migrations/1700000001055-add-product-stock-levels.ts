import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Niveles de stock para reposición: `max_stock` (tope deseado) y
 * `reorder_point` (punto de reorden). `min_stock` ya existía. 0 = no definido
 * (reorder_point=0 → se usa min_stock como umbral de alerta).
 */
export class AddProductStockLevels1700000001055 implements MigrationInterface {
  name = 'AddProductStockLevels1700000001055';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN "max_stock" numeric(14,3) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN "reorder_point" numeric(14,3) NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "reorder_point"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "max_stock"`);
  }
}
