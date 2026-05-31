import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Conteo físico de inventario (stocktake) por sucursal + reporte de varianza.
 * Flujo: crear (OPEN) → registrar cantidades contadas → completar (calcula
 * varianza = contado − sistema, aplica ADJUSTMENT por la diferencia y guarda el
 * costo para valorar la merma) → COMPLETED. Cancelar = CANCELLED (sin ajustes).
 */
export class CreateStockCounts1700000001052 implements MigrationInterface {
  name = 'CreateStockCounts1700000001052';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE SEQUENCE IF NOT EXISTS "stock_count_seq" START 1`);

    await q.query(`
      CREATE TABLE "stock_counts" (
        "id"               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "count_number"     varchar(32) NOT NULL,
        "branch_id"        uuid        NOT NULL,
        "status"           varchar(16) NOT NULL DEFAULT 'OPEN',
        "notes"            text,
        "created_by_id"    uuid        NOT NULL,
        "completed_by_id"  uuid,
        "completed_at"     timestamptz,
        "created_at"       timestamptz NOT NULL DEFAULT now(),
        "updated_at"       timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_sc_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_sc_status" CHECK ("status" IN ('OPEN','COMPLETED','CANCELLED'))
      )
    `);
    await q.query(`CREATE UNIQUE INDEX "uq_stock_count_number" ON "stock_counts"("count_number")`);
    await q.query(`CREATE INDEX "ix_sc_branch" ON "stock_counts"("branch_id", "created_at" DESC)`);

    await q.query(`
      CREATE TABLE "stock_count_items" (
        "id"                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        "count_id"              uuid          NOT NULL,
        "product_id"            uuid          NOT NULL,
        "product_name_snapshot" varchar(180)  NOT NULL,
        "sku"                   varchar(64)   NOT NULL,
        "counted_qty"           numeric(14,3) NOT NULL,
        "system_qty"            numeric(14,3),
        "variance"              numeric(14,3),
        "unit_cost"             numeric(12,2),
        "created_at"            timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "fk_sci_count" FOREIGN KEY ("count_id") REFERENCES "stock_counts"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_sci_count_product" UNIQUE ("count_id", "product_id")
      )
    `);
    await q.query(`CREATE INDEX "ix_sci_count" ON "stock_count_items"("count_id")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "stock_count_items"`);
    await q.query(`DROP TABLE IF EXISTS "stock_counts"`);
    await q.query(`DROP SEQUENCE IF EXISTS "stock_count_seq"`);
  }
}
