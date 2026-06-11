import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Interruptor de la función MULTI-SUCURSAL a nivel de instancia (plan_limits).
 * `false` (DEFAULT) = el sistema nace como mono-sucursal (todo en "Principal");
 * el cliente no ve el selector de sucursal, Sucursales, Transferencias ni el
 * consolidado, y no puede crear sucursales.
 * `true` = habilita la función multi-sucursal.
 *
 * El default es OFF: las instancias nuevas arrancan mono-sucursal y Soltryx
 * (super-admin) lo enciende desde Plan & Licencia cuando el cliente lo contrata.
 * NOTA: cambiar este DEFAULT solo afecta a instancias NUEVAS (donde la migración
 * aún no corrió). Las existentes ya tienen su valor y no se tocan.
 */
export class AddPlanMultiBranch1700000001059 implements MigrationInterface {
  name = 'AddPlanMultiBranch1700000001059';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plan_limits" ADD COLUMN IF NOT EXISTS "multi_branch_enabled" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plan_limits" DROP COLUMN IF EXISTS "multi_branch_enabled"`,
    );
  }
}
