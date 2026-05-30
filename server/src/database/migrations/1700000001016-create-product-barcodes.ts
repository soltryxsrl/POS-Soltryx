import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Múltiples códigos de barras por producto.
 *
 * Migración de datos: copia `products.barcode` existente como `is_primary=true`
 * en `product_barcodes`. La columna vieja `products.barcode` se mantiene como
 * "cache del barcode principal" para no romper queries existentes; se sincroniza
 * desde el servicio al crear/actualizar barcodes.
 *
 * Unique global de barcode: no puede haber dos productos con el mismo barcode
 * (incluso si uno es secundario del otro). Si se intenta, falla con 23505.
 */
export class CreateProductBarcodes1700000001016 implements MigrationInterface {
  name = 'CreateProductBarcodes1700000001016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "product_barcodes" (
        "id"          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "product_id"  uuid         NOT NULL,
        "barcode"     varchar(64)  NOT NULL,
        "is_primary"  boolean      NOT NULL DEFAULT false,
        "created_at"  timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "fk_pb_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_pb_barcode" ON "product_barcodes"("barcode")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_pb_product" ON "product_barcodes"("product_id")`,
    );
    // Solo un primary por producto.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_pb_one_primary_per_product" ON "product_barcodes"("product_id") WHERE "is_primary" = true`,
    );

    // Migrar barcodes existentes (solo productos no eliminados con barcode).
    await queryRunner.query(`
      INSERT INTO "product_barcodes" ("product_id", "barcode", "is_primary")
      SELECT "id", "barcode", true
        FROM "products"
       WHERE "barcode" IS NOT NULL
         AND "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "product_barcodes"`);
  }
}
