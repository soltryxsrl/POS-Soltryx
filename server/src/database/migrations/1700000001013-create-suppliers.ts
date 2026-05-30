import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSuppliers1700000001013 implements MigrationInterface {
  name = 'CreateSuppliers1700000001013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "suppliers" (
        "id"            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "branch_id"     uuid,
        "trade_name"    varchar(180) NOT NULL,
        "legal_name"    varchar(180),
        "rnc"           varchar(32),
        "contact_name"  varchar(180),
        "phone"         varchar(32),
        "email"         varchar(160),
        "address"       varchar(255),
        "notes"         text,
        "is_active"     boolean      NOT NULL DEFAULT true,
        "created_at"    timestamptz  NOT NULL DEFAULT now(),
        "updated_at"    timestamptz  NOT NULL DEFAULT now(),
        "deleted_at"    timestamptz
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_suppliers_rnc" ON "suppliers"("rnc") WHERE "rnc" IS NOT NULL AND "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_suppliers_trade_name" ON "suppliers"(LOWER("trade_name"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "suppliers"`);
  }
}
