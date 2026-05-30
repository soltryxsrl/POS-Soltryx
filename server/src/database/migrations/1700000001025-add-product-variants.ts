import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Variantes (talla / color / sabor / tamaño).
 *
 * Diseño:
 *   - `products.has_variants`: si true, este producto NO se vende directo. Sus
 *     variantes son las que se venden y mantienen stock independiente.
 *   - `product_variants`: cada SKU vendible bajo el producto padre. Hereda
 *     nombre, ITBIS, categoría del padre, pero tiene su PROPIO sale_price
 *     (opcional, override) y stock.
 *   - `sale_items.variant_id`: si la venta fue de una variante, queda anclada.
 *   - `stock_movements.variant_id`: los movimientos se enganchan a la variante
 *     en vez de al padre cuando aplica.
 *
 * Restricción importante: un producto NO puede ser kit Y variantes al mismo
 * tiempo. Enforzado en application layer.
 */
export class AddProductVariants1700000001025 implements MigrationInterface {
  name = 'AddProductVariants1700000001025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN "has_variants" boolean NOT NULL DEFAULT false`,
    );

    await queryRunner.query(`
      CREATE TABLE "product_variants" (
        "id"          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_id"  uuid NOT NULL,
        "name"        varchar(120) NOT NULL,
        "sku"         varchar(64) NOT NULL,
        "barcode"     varchar(64),
        "sale_price"  numeric(12,2),
        "cost_price"  numeric(12,2),
        "stock"       numeric(14,3) NOT NULL DEFAULT 0,
        "min_stock"   numeric(14,3) NOT NULL DEFAULT 0,
        "is_active"   boolean NOT NULL DEFAULT true,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        "updated_at"  timestamptz NOT NULL DEFAULT now(),
        "deleted_at"  timestamptz,
        CONSTRAINT "fk_variant_product" FOREIGN KEY ("product_id")
          REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_variant_sku" ON "product_variants" ("sku") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_variant_barcode" ON "product_variants" ("barcode") WHERE "deleted_at" IS NULL AND "barcode" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_variant_product" ON "product_variants" ("product_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "sale_items" ADD COLUMN "variant_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_items" ADD COLUMN "variant_name_snapshot" varchar(120)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_items" ADD CONSTRAINT "fk_sale_item_variant" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_sale_item_variant" ON "sale_items" ("variant_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD COLUMN "variant_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "fk_stock_movement_variant" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_stock_movement_variant" ON "stock_movements" ("variant_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "fk_stock_movement_variant"`);
    await queryRunner.query(`ALTER TABLE "stock_movements" DROP COLUMN IF EXISTS "variant_id"`);
    await queryRunner.query(`ALTER TABLE "sale_items" DROP CONSTRAINT IF EXISTS "fk_sale_item_variant"`);
    await queryRunner.query(`ALTER TABLE "sale_items" DROP COLUMN IF EXISTS "variant_name_snapshot"`);
    await queryRunner.query(`ALTER TABLE "sale_items" DROP COLUMN IF EXISTS "variant_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_variants"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "has_variants"`);
  }
}
