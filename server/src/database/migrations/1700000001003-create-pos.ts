import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea las tablas core del POS:
 *   cash_registers, cash_sessions, sales, sale_items, payments, stock_movements.
 *
 * Decisiones:
 * - Dinero en numeric(12,2). Cantidades en numeric(14,3) (productos vendidos por peso, p.ej.).
 * - `sale_number` único, secuencial humano-legible (lo genera la app, no la DB).
 * - `sale_items` guarda snapshots de nombre, precio, tasa de impuesto al momento de venta.
 * - `stock_movements` es la fuente de verdad de auditoría. `products.stock` es un cache.
 */
export class CreatePos1700000001003 implements MigrationInterface {
  name = 'CreatePos1700000001003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cash_registers" (
        "id"          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "branch_id"   uuid,
        "name"        varchar(120) NOT NULL,
        "code"        varchar(32)  NOT NULL UNIQUE,
        "is_active"   boolean      NOT NULL DEFAULT true,
        "created_at"  timestamptz  NOT NULL DEFAULT now(),
        "updated_at"  timestamptz  NOT NULL DEFAULT now(),
        "deleted_at"  timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cash_sessions" (
        "id"               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        "branch_id"        uuid,
        "cash_register_id" uuid          NOT NULL,
        "opened_by_id"     uuid          NOT NULL,
        "closed_by_id"     uuid,
        "opened_at"        timestamptz   NOT NULL DEFAULT now(),
        "closed_at"        timestamptz,
        "opening_amount"   numeric(12,2) NOT NULL DEFAULT 0,
        "expected_amount"  numeric(12,2),
        "counted_amount"   numeric(12,2),
        "difference"       numeric(12,2),
        "status"           varchar(16)   NOT NULL DEFAULT 'OPEN',
        "notes"            text,
        "created_at"       timestamptz   NOT NULL DEFAULT now(),
        "updated_at"       timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "fk_cs_register" FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_cs_opened_by" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_cs_closed_by" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sales" (
        "id"                 uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
        "branch_id"          uuid,
        "sale_number"        varchar(32)    NOT NULL,
        "customer_id"        uuid,
        "user_id"            uuid           NOT NULL,
        "cash_session_id"    uuid           NOT NULL,
        "subtotal"           numeric(12,2)  NOT NULL DEFAULT 0,
        "discount_total"     numeric(12,2)  NOT NULL DEFAULT 0,
        "tax_total"          numeric(12,2)  NOT NULL DEFAULT 0,
        "total"              numeric(12,2)  NOT NULL DEFAULT 0,
        "status"             varchar(16)    NOT NULL DEFAULT 'COMPLETED',
        "fiscal_status"      varchar(16)    NOT NULL DEFAULT 'NOT_REQUIRED',
        "fiscal_document_id" uuid,
        "notes"              text,
        "created_at"         timestamptz    NOT NULL DEFAULT now(),
        "updated_at"         timestamptz    NOT NULL DEFAULT now(),
        "cancelled_at"       timestamptz,
        "cancelled_by_id"    uuid,
        "cancel_reason"      varchar(255),
        CONSTRAINT "fk_sales_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_sales_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_sales_session" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_sales_cancelled_by" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sale_items" (
        "id"                     uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
        "sale_id"                uuid           NOT NULL,
        "product_id"             uuid           NOT NULL,
        "product_name_snapshot"  varchar(180)   NOT NULL,
        "product_sku_snapshot"   varchar(64)    NOT NULL,
        "quantity"               numeric(14,3)  NOT NULL,
        "unit_price"             numeric(12,2)  NOT NULL,
        "discount"               numeric(12,2)  NOT NULL DEFAULT 0,
        "tax_rate"               numeric(5,2)   NOT NULL DEFAULT 0,
        "tax_total"              numeric(12,2)  NOT NULL DEFAULT 0,
        "total"                  numeric(12,2)  NOT NULL,
        "created_at"             timestamptz    NOT NULL DEFAULT now(),
        CONSTRAINT "fk_si_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_si_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id"         uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
        "sale_id"    uuid           NOT NULL,
        "method"     varchar(16)    NOT NULL,
        "amount"     numeric(12,2)  NOT NULL,
        "reference"  varchar(120),
        "status"     varchar(16)    NOT NULL DEFAULT 'COMPLETED',
        "created_at" timestamptz    NOT NULL DEFAULT now(),
        CONSTRAINT "fk_payments_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "stock_movements" (
        "id"             uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
        "branch_id"      uuid,
        "product_id"     uuid           NOT NULL,
        "type"           varchar(24)    NOT NULL,
        "quantity"       numeric(14,3)  NOT NULL,
        "previous_stock" numeric(14,3)  NOT NULL,
        "new_stock"      numeric(14,3)  NOT NULL,
        "reason"         varchar(255),
        "sale_id"        uuid,
        "user_id"        uuid           NOT NULL,
        "created_at"     timestamptz    NOT NULL DEFAULT now(),
        CONSTRAINT "fk_sm_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_sm_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_sm_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_sales_sale_number" ON "sales"("sale_number")`);
    await queryRunner.query(`CREATE INDEX "ix_sales_cash_session_id" ON "sales"("cash_session_id")`);
    await queryRunner.query(`CREATE INDEX "ix_sales_user_id" ON "sales"("user_id")`);
    await queryRunner.query(`CREATE INDEX "ix_sales_created_at" ON "sales"("created_at" DESC)`);
    await queryRunner.query(`CREATE INDEX "ix_sales_status" ON "sales"("status")`);
    await queryRunner.query(`CREATE INDEX "ix_sale_items_sale_id" ON "sale_items"("sale_id")`);
    await queryRunner.query(`CREATE INDEX "ix_sale_items_product_id" ON "sale_items"("product_id")`);
    await queryRunner.query(`CREATE INDEX "ix_payments_sale_id" ON "payments"("sale_id")`);
    await queryRunner.query(`CREATE INDEX "ix_stock_movements_product_id_created_at" ON "stock_movements"("product_id", "created_at" DESC)`);
    await queryRunner.query(`CREATE INDEX "ix_stock_movements_sale_id" ON "stock_movements"("sale_id") WHERE "sale_id" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX "ix_cash_sessions_register_status" ON "cash_sessions"("cash_register_id", "status")`);
    await queryRunner.query(`CREATE INDEX "ix_cash_sessions_opened_by" ON "cash_sessions"("opened_by_id")`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_cash_sessions_one_open_per_register" ON "cash_sessions"("cash_register_id") WHERE "status" = 'OPEN'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_movements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sale_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sales"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cash_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cash_registers"`);
  }
}
