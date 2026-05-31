import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Habilita multi-sucursal:
 *   1. Crea la tabla `branches` y siembra la sucursal por defecto "Principal".
 *   2. Backfillea todas las filas con branch_id NULL a Principal.
 *   3. Agrega FK (ON DELETE RESTRICT) + índice + NOT NULL en cada tabla scoped.
 *
 * `users` recibe FK pero NO NOT NULL: ADMIN puede ser un usuario sin sucursal
 * (la regla "obligatoria para no-admin" la valida UsersService).
 * `cash_movements` no tiene branch_id propio — llega a la sucursal vía cash_session_id.
 */
export class CreateBranches1700000001043 implements MigrationInterface {
  name = 'CreateBranches1700000001043';

  /** Tablas scoped que pasan a branch_id NOT NULL. `users` se trata aparte. */
  private readonly scoped = [
    'categories',
    'products',
    'customers',
    'suppliers',
    'cash_registers',
    'cash_sessions',
    'sales',
    'stock_movements',
    'fiscal_sequences',
    'fiscal_documents',
    'sale_returns',
    'purchase_orders',
    'promotions',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "branches" (
        "id"         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "code"       varchar(32)  NOT NULL UNIQUE,
        "name"       varchar(120) NOT NULL,
        "rnc"        varchar(16),
        "address"    varchar(255),
        "phone"      varchar(40),
        "is_active"  boolean      NOT NULL DEFAULT true,
        "created_at" timestamptz  NOT NULL DEFAULT now(),
        "updated_at" timestamptz  NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);

    // Sucursal por defecto: todo lo que ya existe pertenece a ella.
    await queryRunner.query(
      `INSERT INTO "branches" ("code", "name") VALUES ('PRINCIPAL', 'Principal')`,
    );

    const principal = `(SELECT "id" FROM "branches" WHERE "code" = 'PRINCIPAL')`;

    // users: backfill + FK. Índice ix_users_branch_id ya existe (create-auth). Sin NOT NULL.
    await queryRunner.query(
      `UPDATE "users" SET "branch_id" = ${principal} WHERE "branch_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "fk_users_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT`,
    );

    for (const t of this.scoped) {
      await queryRunner.query(
        `UPDATE "${t}" SET "branch_id" = ${principal} WHERE "branch_id" IS NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "${t}" ADD CONSTRAINT "fk_${t}_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "ix_${t}_branch_id" ON "${t}"("branch_id")`,
      );
      await queryRunner.query(
        `ALTER TABLE "${t}" ALTER COLUMN "branch_id" SET NOT NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const t of this.scoped) {
      await queryRunner.query(
        `ALTER TABLE "${t}" ALTER COLUMN "branch_id" DROP NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "${t}" DROP CONSTRAINT IF EXISTS "fk_${t}_branch"`,
      );
      await queryRunner.query(`DROP INDEX IF EXISTS "ix_${t}_branch_id"`);
    }
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_branch"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "branches"`);
  }
}
