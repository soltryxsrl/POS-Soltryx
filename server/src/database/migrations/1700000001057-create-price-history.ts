import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Historial de cambios de precio (auditoría). Cada cambio de `sale_price` o
 * `cost_price` de un producto/variante —individual o masivo— registra una fila
 * con valor anterior/nuevo, origen y usuario. Acotado por sucursal.
 */
export class CreatePriceHistory1700000001057 implements MigrationInterface {
  name = 'CreatePriceHistory1700000001057';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "price_history" (
        "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "branch_id"   uuid NOT NULL,
        "product_id"  uuid NOT NULL,
        "variant_id"  uuid,
        "field"       varchar(16) NOT NULL,
        "old_value"   numeric(14,2) NOT NULL,
        "new_value"   numeric(14,2) NOT NULL,
        "source"      varchar(16) NOT NULL,
        "reason"      varchar(255),
        "user_id"     uuid,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_price_history_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_price_history_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_price_history_product" ON "price_history"("product_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_price_history_branch" ON "price_history"("branch_id", "created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "price_history"`);
  }
}
