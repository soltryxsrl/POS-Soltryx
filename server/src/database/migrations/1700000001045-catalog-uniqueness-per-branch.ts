import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Unicidad de catálogo POR SUCURSAL. Con catálogo separado por sucursal, el
 * mismo SKU / código de barras puede existir en sucursales distintas (es el
 * MISMO producto en otra tienda). Cambia los índices únicos de `products` de
 * globales a `(branch_id, sku)` y `(branch_id, barcode)`.
 *
 * Las variantes y los barcodes secundarios (`product_variants`,
 * `product_barcodes`) conservan unicidad global por ahora — el clonado de
 * catálogo (MVP) solo copia productos simples, que usan `products.barcode`.
 */
export class CatalogUniquenessPerBranch1700000001045 implements MigrationInterface {
  name = 'CatalogUniquenessPerBranch1700000001045';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "uq_products_sku"`);
    await q.query(`DROP INDEX IF EXISTS "uq_products_barcode"`);
    await q.query(
      `CREATE UNIQUE INDEX "uq_products_branch_sku"
       ON "products"("branch_id", "sku") WHERE "deleted_at" IS NULL`,
    );
    await q.query(
      `CREATE UNIQUE INDEX "uq_products_branch_barcode"
       ON "products"("branch_id", "barcode")
       WHERE "barcode" IS NOT NULL AND "deleted_at" IS NULL`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    // El UNIQUE previo era GLOBAL. Tras clonar catálogo entre sucursales hay
    // SKUs/códigos duplicados a propósito entre sucursales, así que recrear el
    // UNIQUE global fallaría (23505) y bloquearía el revert. Recreamos índices
    // PLANOS (no únicos) con los mismos nombres: conservan el rendimiento de
    // búsqueda sin reimponer una unicidad que los datos ya no cumplen.
    await q.query(`DROP INDEX IF EXISTS "uq_products_branch_sku"`);
    await q.query(`DROP INDEX IF EXISTS "uq_products_branch_barcode"`);
    await q.query(
      `CREATE INDEX "uq_products_sku"
       ON "products"("sku") WHERE "deleted_at" IS NULL`,
    );
    await q.query(
      `CREATE INDEX "uq_products_barcode"
       ON "products"("barcode") WHERE "barcode" IS NOT NULL AND "deleted_at" IS NULL`,
    );
  }
}
