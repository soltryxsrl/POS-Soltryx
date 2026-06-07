import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabla `plan_limits`: topes del PLAN comercial contratado por el cliente
 * (máximo de usuarios y de sucursales que puede crear en su instancia).
 *
 * Singleton (id = 1, forzado por CHECK), como `business_settings`. A diferencia
 * de la config del negocio, NO se edita desde el panel del cliente: el cambio de
 * plan (upsell) lo hace Soltryx por SQL/endpoint protegido — el admin del cliente
 * no puede subirse su propio tope.
 *
 * Defecto = NULL en ambos = ILIMITADO, para no capar instancias existentes ni la
 * recién creada. Al provisionar a un cliente con plan limitado:
 *   UPDATE plan_limits SET max_users = 5, max_branches = 10 WHERE id = 1;
 */
export class CreatePlanLimits1700000001058 implements MigrationInterface {
  name = 'CreatePlanLimits1700000001058';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "plan_limits" (
        "id"           smallint    PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
        "max_users"    integer,
        "max_branches" integer,
        "updated_at"   timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `INSERT INTO "plan_limits" ("id") VALUES (1) ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "plan_limits"`);
  }
}
