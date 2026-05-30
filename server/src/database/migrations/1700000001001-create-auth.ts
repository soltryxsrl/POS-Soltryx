import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea las tablas base de autenticación: roles, users, user_roles, refresh_tokens.
 */
export class CreateAuth1700000001001 implements MigrationInterface {
  name = 'CreateAuth1700000001001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id"          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "code"        varchar(32)  NOT NULL UNIQUE,
        "name"        varchar(64)  NOT NULL,
        "description" varchar(255),
        "created_at"  timestamptz  NOT NULL DEFAULT now(),
        "updated_at"  timestamptz  NOT NULL DEFAULT now(),
        "deleted_at"  timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "branch_id"       uuid,
        "email"           varchar(160) NOT NULL UNIQUE,
        "username"        varchar(64)  NOT NULL UNIQUE,
        "full_name"       varchar(160) NOT NULL,
        "password_hash"   varchar(255) NOT NULL,
        "is_active"       boolean      NOT NULL DEFAULT true,
        "last_login_at"   timestamptz,
        "created_at"      timestamptz  NOT NULL DEFAULT now(),
        "updated_at"      timestamptz  NOT NULL DEFAULT now(),
        "deleted_at"      timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "user_id"    uuid NOT NULL,
        "role_id"    uuid NOT NULL,
        "assigned_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_roles" PRIMARY KEY ("user_id", "role_id"),
        CONSTRAINT "fk_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id"           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"      uuid         NOT NULL,
        "token_hash"   varchar(255) NOT NULL UNIQUE,
        "expires_at"   timestamptz  NOT NULL,
        "revoked_at"   timestamptz,
        "user_agent"   varchar(255),
        "ip_address"   varchar(64),
        "created_at"   timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "ix_users_branch_id" ON "users"("branch_id")`);
    await queryRunner.query(`CREATE INDEX "ix_refresh_tokens_user_id" ON "refresh_tokens"("user_id")`);
    await queryRunner.query(`CREATE INDEX "ix_refresh_tokens_expires_at" ON "refresh_tokens"("expires_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
  }
}
