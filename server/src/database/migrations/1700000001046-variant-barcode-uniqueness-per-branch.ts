import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Unicidad POR SUCURSAL para variantes y códigos de barras secundarios.
 *
 * `product_variants` y `product_barcodes` no tenían `branch_id` (lo heredaban del
 * producto padre vía FK), y sus índices únicos de SKU/barcode eran GLOBALES. Con
 * catálogo separado por sucursal eso impide clonar variantes/kits a otra sucursal
 * (el mismo SKU/código es el MISMO producto en otra tienda). Esta migración:
 *   1) denormaliza `branch_id` en ambas tablas (backfill desde el producto padre,
 *      FK a branches, NOT NULL, índice) — igual que el resto del sistema, y
 *   2) cambia los índices únicos a `(branch_id, …)`.
 *
 * Es MENOS restrictivo que el unique global previo (que ya garantizaba unicidad
 * global), así que la creación de los índices nuevos no puede fallar por datos.
 */
export class VariantBarcodeUniquenessPerBranch1700000001046
  implements MigrationInterface
{
  name = 'VariantBarcodeUniquenessPerBranch1700000001046';

  public async up(q: QueryRunner): Promise<void> {
    // ---- product_variants ----
    await q.query(`ALTER TABLE "product_variants" ADD COLUMN "branch_id" uuid`);
    await q.query(`
      UPDATE "product_variants" pv
         SET "branch_id" = p."branch_id"
        FROM "products" p
       WHERE pv."product_id" = p."id"
    `);
    await q.query(
      `ALTER TABLE "product_variants"
         ADD CONSTRAINT "fk_variant_branch"
         FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT`,
    );
    await q.query(
      `ALTER TABLE "product_variants" ALTER COLUMN "branch_id" SET NOT NULL`,
    );
    await q.query(
      `CREATE INDEX "ix_variant_branch_id" ON "product_variants" ("branch_id")`,
    );
    await q.query(`DROP INDEX IF EXISTS "uq_variant_sku"`);
    await q.query(`DROP INDEX IF EXISTS "uq_variant_barcode"`);
    await q.query(
      `CREATE UNIQUE INDEX "uq_variant_branch_sku"
         ON "product_variants" ("branch_id", "sku") WHERE "deleted_at" IS NULL`,
    );
    await q.query(
      `CREATE UNIQUE INDEX "uq_variant_branch_barcode"
         ON "product_variants" ("branch_id", "barcode")
         WHERE "deleted_at" IS NULL AND "barcode" IS NOT NULL`,
    );

    // ---- product_barcodes ----
    await q.query(`ALTER TABLE "product_barcodes" ADD COLUMN "branch_id" uuid`);
    await q.query(`
      UPDATE "product_barcodes" pb
         SET "branch_id" = p."branch_id"
        FROM "products" p
       WHERE pb."product_id" = p."id"
    `);
    await q.query(
      `ALTER TABLE "product_barcodes"
         ADD CONSTRAINT "fk_pb_branch"
         FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT`,
    );
    await q.query(
      `ALTER TABLE "product_barcodes" ALTER COLUMN "branch_id" SET NOT NULL`,
    );
    await q.query(
      `CREATE INDEX "ix_pb_branch_id" ON "product_barcodes" ("branch_id")`,
    );
    await q.query(`DROP INDEX IF EXISTS "uq_pb_barcode"`);
    await q.query(
      `CREATE UNIQUE INDEX "uq_pb_branch_barcode"
         ON "product_barcodes" ("branch_id", "barcode")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    // Los índices únicos previos eran GLOBALES. Una vez que se clona catálogo
    // entre sucursales, existen a propósito SKUs/códigos duplicados entre
    // sucursales, así que recrear el UNIQUE global fallaría con 23505 y haría
    // imposible revertir esta migración. Recreamos índices PLANOS (no únicos)
    // bajo los mismos nombres: preservan el rendimiento de búsqueda y la
    // simetría up/down sin reimponer una unicidad que los datos ya no cumplen
    // (restaurarla exigiría borrar duplicados = pérdida de datos).

    // ---- product_barcodes ----
    await q.query(`DROP INDEX IF EXISTS "uq_pb_branch_barcode"`);
    await q.query(`CREATE INDEX "uq_pb_barcode" ON "product_barcodes" ("barcode")`);
    await q.query(`DROP INDEX IF EXISTS "ix_pb_branch_id"`);
    await q.query(
      `ALTER TABLE "product_barcodes" DROP CONSTRAINT IF EXISTS "fk_pb_branch"`,
    );
    await q.query(`ALTER TABLE "product_barcodes" DROP COLUMN IF EXISTS "branch_id"`);

    // ---- product_variants ----
    await q.query(`DROP INDEX IF EXISTS "uq_variant_branch_sku"`);
    await q.query(`DROP INDEX IF EXISTS "uq_variant_branch_barcode"`);
    await q.query(
      `CREATE INDEX "uq_variant_sku" ON "product_variants" ("sku") WHERE "deleted_at" IS NULL`,
    );
    await q.query(
      `CREATE INDEX "uq_variant_barcode" ON "product_variants" ("barcode") WHERE "deleted_at" IS NULL AND "barcode" IS NOT NULL`,
    );
    await q.query(`DROP INDEX IF EXISTS "ix_variant_branch_id"`);
    await q.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "fk_variant_branch"`,
    );
    await q.query(`ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "branch_id"`);
  }
}
