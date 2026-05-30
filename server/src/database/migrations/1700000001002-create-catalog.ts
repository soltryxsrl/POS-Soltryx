import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea las tablas de catálogo: categories, products, customers.
 */
export class CreateCatalog1700000001002 implements MigrationInterface {
  name = 'CreateCatalog1700000001002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id"          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "branch_id"   uuid,
        "name"        varchar(120) NOT NULL,
        "description" varchar(255),
        "parent_id"   uuid,
        "is_active"   boolean      NOT NULL DEFAULT true,
        "created_at"  timestamptz  NOT NULL DEFAULT now(),
        "updated_at"  timestamptz  NOT NULL DEFAULT now(),
        "deleted_at"  timestamptz,
        CONSTRAINT "fk_categories_parent" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id"            uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
        "branch_id"     uuid,
        "name"          varchar(180)   NOT NULL,
        "sku"           varchar(64)    NOT NULL,
        "barcode"       varchar(64),
        "description"   text,
        "category_id"   uuid,
        "cost_price"    numeric(12,2)  NOT NULL DEFAULT 0,
        "sale_price"    numeric(12,2)  NOT NULL DEFAULT 0,
        "tax_rate"      numeric(5,2)   NOT NULL DEFAULT 0,
        "stock"         numeric(14,3)  NOT NULL DEFAULT 0,
        "min_stock"     numeric(14,3)  NOT NULL DEFAULT 0,
        "is_active"     boolean        NOT NULL DEFAULT true,
        "created_at"    timestamptz    NOT NULL DEFAULT now(),
        "updated_at"    timestamptz    NOT NULL DEFAULT now(),
        "deleted_at"    timestamptz,
        CONSTRAINT "fk_products_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id"            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "branch_id"     uuid,
        "document_type" varchar(16),
        "document"      varchar(32),
        "full_name"     varchar(180) NOT NULL,
        "email"         varchar(160),
        "phone"         varchar(32),
        "address"       varchar(255),
        "is_active"     boolean      NOT NULL DEFAULT true,
        "created_at"    timestamptz  NOT NULL DEFAULT now(),
        "updated_at"    timestamptz  NOT NULL DEFAULT now(),
        "deleted_at"    timestamptz
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_products_sku" ON "products"("sku") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_products_barcode" ON "products"("barcode") WHERE "barcode" IS NOT NULL AND "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "ix_products_category_id" ON "products"("category_id")`);
    await queryRunner.query(`CREATE INDEX "ix_products_branch_id" ON "products"("branch_id")`);
    await queryRunner.query(`CREATE INDEX "ix_products_name_trgm" ON "products"(LOWER("name"))`);
    await queryRunner.query(`CREATE INDEX "ix_categories_parent_id" ON "categories"("parent_id")`);
    await queryRunner.query(`CREATE INDEX "ix_customers_document" ON "customers"("document_type", "document") WHERE "document" IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "customers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);
  }
}
