import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Costo unitario por movimiento (kardex valorizado). Es la base de costo
 * vigente (promedio móvil) al momento del movimiento — para compras se guarda
 * el costo recibido. NULL = histórico (movimientos previos a esta columna): la
 * UI lo muestra como "—" y no calcula importe/saldo valorado para esa fila.
 */
export class AddStockMovementUnitCost1700000001056 implements MigrationInterface {
  name = 'AddStockMovementUnitCost1700000001056';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD COLUMN "unit_cost" numeric(14,4)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP COLUMN IF EXISTS "unit_cost"`,
    );
  }
}
