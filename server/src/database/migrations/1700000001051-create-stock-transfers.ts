import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Transferencias de stock ENTRE sucursales. Como el catálogo es separado por
 * sucursal, cada ítem mapea el producto ORIGEN (sucursal A) con el producto
 * EQUIVALENTE por SKU en la sucursal DESTINO (B). Flujo:
 *   - Crear (enviar): descuenta el stock del origen (TRANSFER_OUT) → IN_TRANSIT.
 *   - Recibir: abona el stock del destino (TRANSFER_IN) → RECEIVED.
 *   - Cancelar (antes de recibir): restituye el stock del origen → CANCELLED.
 * El "stock en tránsito" es lo que salió del origen y aún no entra al destino.
 */
export class CreateStockTransfers1700000001051 implements MigrationInterface {
  name = 'CreateStockTransfers1700000001051';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE SEQUENCE IF NOT EXISTS "stock_transfer_seq" START 1`);

    await q.query(`
      CREATE TABLE "stock_transfers" (
        "id"               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "transfer_number"  varchar(32) NOT NULL,
        "source_branch_id" uuid        NOT NULL,
        "dest_branch_id"   uuid        NOT NULL,
        "status"           varchar(16) NOT NULL DEFAULT 'IN_TRANSIT',
        "notes"            text,
        "created_by_id"    uuid        NOT NULL,
        "received_by_id"   uuid,
        "received_at"      timestamptz,
        "cancelled_by_id"  uuid,
        "cancelled_at"     timestamptz,
        "cancel_reason"    varchar(255),
        "created_at"       timestamptz NOT NULL DEFAULT now(),
        "updated_at"       timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_st_source_branch" FOREIGN KEY ("source_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_st_dest_branch"   FOREIGN KEY ("dest_branch_id")   REFERENCES "branches"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_st_status" CHECK ("status" IN ('IN_TRANSIT','RECEIVED','CANCELLED')),
        CONSTRAINT "ck_st_branches_diff" CHECK ("source_branch_id" <> "dest_branch_id")
      )
    `);
    await q.query(
      `CREATE UNIQUE INDEX "uq_stock_transfer_number" ON "stock_transfers"("transfer_number")`,
    );
    await q.query(
      `CREATE INDEX "ix_st_source" ON "stock_transfers"("source_branch_id", "created_at" DESC)`,
    );
    await q.query(
      `CREATE INDEX "ix_st_dest" ON "stock_transfers"("dest_branch_id", "created_at" DESC)`,
    );

    await q.query(`
      CREATE TABLE "stock_transfer_items" (
        "id"                    uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "transfer_id"           uuid         NOT NULL,
        "source_product_id"     uuid         NOT NULL,
        "dest_product_id"       uuid         NOT NULL,
        "product_name_snapshot" varchar(180) NOT NULL,
        "sku"                   varchar(64)  NOT NULL,
        "quantity"              numeric(14,3) NOT NULL,
        "created_at"            timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_sti_transfer" FOREIGN KEY ("transfer_id") REFERENCES "stock_transfers"("id") ON DELETE CASCADE,
        CONSTRAINT "ck_sti_qty_positive" CHECK ("quantity" > 0)
      )
    `);
    await q.query(
      `CREATE INDEX "ix_sti_transfer" ON "stock_transfer_items"("transfer_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "stock_transfer_items"`);
    await q.query(`DROP TABLE IF EXISTS "stock_transfers"`);
    await q.query(`DROP SEQUENCE IF EXISTS "stock_transfer_seq"`);
  }
}
