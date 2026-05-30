import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Devoluciones de venta (parciales o totales).
 *
 * Workflow:
 *   1. Cliente devuelve uno o más items de una venta COMPLETED.
 *   2. Se crea sale_returns + sale_return_items (cantidades devueltas).
 *   3. Se aumenta el stock (RETURN stock_movement por línea).
 *   4. Refund_method dice cómo se devolvió el dinero:
 *      - CASH/CARD/TRANSFER → cash de la caja
 *      - STORE_CREDIT → crédito a cuenta del cliente (REVERSAL en su ledger)
 *      - ACCOUNT → reduce el saldo de crédito del cliente (solo si la venta fue a crédito)
 *
 * Una venta puede tener múltiples devoluciones (parciales). Si la suma de
 * cantidades devueltas == la cantidad vendida, ningún ítem queda pendiente.
 * El service valida que received_quantity acumulado no exceda lo vendido.
 *
 * IMPORTANTE: este flow NO marca la sale como CANCELLED — eso queda para el
 * caso "anulación total dentro del día". Devoluciones son parciales y se
 * registran como documento aparte (más cercano a una nota de crédito).
 */
export class CreateSaleReturns1700000001019 implements MigrationInterface {
  name = 'CreateSaleReturns1700000001019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sale_returns" (
        "id"              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        "branch_id"       uuid,
        "return_number"   varchar(32)   NOT NULL,
        "sale_id"         uuid          NOT NULL,
        "cash_session_id" uuid          NOT NULL,
        "customer_id"     uuid,
        "user_id"         uuid          NOT NULL,
        "refund_method"   varchar(16)   NOT NULL,
        "subtotal"        numeric(12,2) NOT NULL DEFAULT 0,
        "tax_total"       numeric(12,2) NOT NULL DEFAULT 0,
        "total"           numeric(12,2) NOT NULL DEFAULT 0,
        "reason"          varchar(255),
        "notes"           text,
        "created_at"      timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "fk_sr_sale"     FOREIGN KEY ("sale_id")         REFERENCES "sales"("id")          ON DELETE RESTRICT,
        CONSTRAINT "fk_sr_session"  FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id")  ON DELETE RESTRICT,
        CONSTRAINT "fk_sr_customer" FOREIGN KEY ("customer_id")     REFERENCES "customers"("id")      ON DELETE SET NULL,
        CONSTRAINT "fk_sr_user"     FOREIGN KEY ("user_id")         REFERENCES "users"("id")          ON DELETE RESTRICT,
        CONSTRAINT "ck_sr_refund_method" CHECK ("refund_method" IN ('CASH', 'CARD', 'TRANSFER', 'STORE_CREDIT', 'ACCOUNT', 'OTHER'))
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_sr_return_number" ON "sale_returns"("return_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_sr_sale" ON "sale_returns"("sale_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_sr_session_created" ON "sale_returns"("cash_session_id", "created_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "sale_return_items" (
        "id"                      uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
        "sale_return_id"          uuid           NOT NULL,
        "sale_item_id"            uuid           NOT NULL,
        "product_id"              uuid           NOT NULL,
        "product_name_snapshot"   varchar(180)   NOT NULL,
        "product_sku_snapshot"    varchar(64)    NOT NULL,
        "quantity"                numeric(14,3)  NOT NULL,
        "unit_price"              numeric(12,2)  NOT NULL,
        "tax_rate"                numeric(5,2)   NOT NULL DEFAULT 0,
        "tax_total"               numeric(12,2)  NOT NULL DEFAULT 0,
        "total"                   numeric(12,2)  NOT NULL,
        "created_at"              timestamptz    NOT NULL DEFAULT now(),
        CONSTRAINT "fk_sri_return" FOREIGN KEY ("sale_return_id") REFERENCES "sale_returns"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_sri_item"   FOREIGN KEY ("sale_item_id")   REFERENCES "sale_items"("id")   ON DELETE RESTRICT,
        CONSTRAINT "ck_sri_qty_positive" CHECK ("quantity" > 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_sri_return" ON "sale_return_items"("sale_return_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_sri_sale_item" ON "sale_return_items"("sale_item_id")`,
    );

    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS sale_return_seq START WITH 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sale_return_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sale_returns"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS sale_return_seq`);
  }
}
