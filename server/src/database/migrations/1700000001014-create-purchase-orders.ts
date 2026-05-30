import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Órdenes de compra a proveedores y sus líneas.
 *
 * Workflow:
 *   PENDING → PARTIAL → RECEIVED  (auto cuando Σ received >= Σ ordered)
 *   PENDING → CANCELLED            (cancelación manual antes de recibir)
 *
 * Al recibir (parcial o total) se inserta un stock_movement de tipo PURCHASE
 * por cada línea con received_quantity > 0. La sumatoria por línea persiste
 * en purchase_order_items.received_quantity para auditar entregas parciales.
 *
 * `purchase_orders.subtotal/tax_total/total` se calcula en el server al crear
 * y se recalcula al cancelar (a 0 si se cancela antes de recibir).
 */
export class CreatePurchaseOrders1700000001014 implements MigrationInterface {
  name = 'CreatePurchaseOrders1700000001014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "purchase_orders" (
        "id"                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        "branch_id"         uuid,
        "order_number"      varchar(32)   NOT NULL,
        "supplier_id"       uuid          NOT NULL,
        "status"            varchar(16)   NOT NULL DEFAULT 'PENDING',
        "expected_date"     date,
        "supplier_invoice"  varchar(120),
        "subtotal"          numeric(12,2) NOT NULL DEFAULT 0,
        "tax_total"         numeric(12,2) NOT NULL DEFAULT 0,
        "total"             numeric(12,2) NOT NULL DEFAULT 0,
        "notes"             text,
        "created_by_id"     uuid          NOT NULL,
        "received_at"       timestamptz,
        "received_by_id"    uuid,
        "cancelled_at"      timestamptz,
        "cancelled_by_id"   uuid,
        "cancel_reason"     varchar(255),
        "created_at"        timestamptz   NOT NULL DEFAULT now(),
        "updated_at"        timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "fk_po_supplier"    FOREIGN KEY ("supplier_id")     REFERENCES "suppliers"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_po_creator"     FOREIGN KEY ("created_by_id")   REFERENCES "users"("id")     ON DELETE RESTRICT,
        CONSTRAINT "fk_po_receiver"    FOREIGN KEY ("received_by_id")  REFERENCES "users"("id")     ON DELETE RESTRICT,
        CONSTRAINT "fk_po_canceller"   FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id")     ON DELETE RESTRICT,
        CONSTRAINT "ck_po_status"      CHECK ("status" IN ('PENDING', 'PARTIAL', 'RECEIVED', 'CANCELLED'))
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_po_order_number" ON "purchase_orders"("order_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_po_supplier" ON "purchase_orders"("supplier_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_po_status_created" ON "purchase_orders"("status", "created_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "purchase_order_items" (
        "id"                      uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
        "purchase_order_id"       uuid           NOT NULL,
        "product_id"              uuid           NOT NULL,
        "product_name_snapshot"   varchar(180)   NOT NULL,
        "product_sku_snapshot"    varchar(64)    NOT NULL,
        "ordered_quantity"        numeric(14,3)  NOT NULL,
        "received_quantity"       numeric(14,3)  NOT NULL DEFAULT 0,
        "unit_cost"               numeric(12,2)  NOT NULL,
        "tax_rate"                numeric(5,2)   NOT NULL DEFAULT 0,
        "tax_total"               numeric(12,2)  NOT NULL DEFAULT 0,
        "total"                   numeric(12,2)  NOT NULL,
        "created_at"              timestamptz    NOT NULL DEFAULT now(),
        CONSTRAINT "fk_poi_po"      FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_poi_product" FOREIGN KEY ("product_id")        REFERENCES "products"("id")        ON DELETE RESTRICT,
        CONSTRAINT "ck_poi_qty_ordered_positive"     CHECK ("ordered_quantity" > 0),
        CONSTRAINT "ck_poi_qty_received_in_range"    CHECK ("received_quantity" >= 0 AND "received_quantity" <= "ordered_quantity")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_poi_po" ON "purchase_order_items"("purchase_order_id")`,
    );

    // Sequence para order_number humano-legible (PO-000001 etc.)
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS purchase_order_seq START WITH 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_order_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_orders"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS purchase_order_seq`);
  }
}
