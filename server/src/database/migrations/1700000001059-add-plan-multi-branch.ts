import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Interruptor de la función MULTI-SUCURSAL a nivel de instancia (plan_limits).
 * `true` (default) = comportamiento actual (multi-sucursal habilitado).
 * `false` = apaga la función: el sistema opera como mono-sucursal (todo en
 * "Principal"); el cliente no ve el selector de sucursal, Sucursales,
 * Transferencias ni el consolidado, y no puede crear sucursales.
 *
 * Lo controla Soltryx (super-admin) desde la página de Plan & Licencia.
 */
export class AddPlanMultiBranch1700000001059 implements MigrationInterface {
  name = 'AddPlanMultiBranch1700000001059';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plan_limits" ADD COLUMN IF NOT EXISTS "multi_branch_enabled" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plan_limits" DROP COLUMN IF EXISTS "multi_branch_enabled"`,
    );
  }
}
