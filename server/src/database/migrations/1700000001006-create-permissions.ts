import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Permisos finos (RBAC). Cada permiso tiene un código tipo `module.action`
 * (ej. `users.create`, `pos.refund`). Los roles agrupan permisos vía
 * `role_permissions`. Los usuarios heredan permisos por sus roles.
 */
export class CreatePermissions1700000001006 implements MigrationInterface {
  name = 'CreatePermissions1700000001006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id"          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        "code"        varchar(64)   NOT NULL UNIQUE,
        "name"        varchar(128)  NOT NULL,
        "module"      varchar(32)   NOT NULL,
        "description" varchar(255),
        "created_at"  timestamptz   NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id"       uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        "assigned_at"   timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "fk_rp_role"       FOREIGN KEY ("role_id")       REFERENCES "roles"("id")       ON DELETE CASCADE,
        CONSTRAINT "fk_rp_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "ix_permissions_module" ON "permissions"("module")`);
    await queryRunner.query(`CREATE INDEX "ix_role_permissions_role" ON "role_permissions"("role_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
  }
}
