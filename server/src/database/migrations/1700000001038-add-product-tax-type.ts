import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enlaza productos a un tipo de ITBIS del catálogo `tax_types`.
 *
 * `tax_rate` se queda como snapshot efectivo (lo que usa el cálculo de ventas):
 * cuando un producto referencia un `tax_type_code`, el servicio copia la tasa
 * del tipo a `tax_rate`. El backfill de productos existentes se hace en el seed
 * (run-seed.ts), ya que el catálogo de tipos también se siembra ahí.
 */
export class AddProductTaxType1700000001038 implements MigrationInterface {
  name = 'AddProductTaxType1700000001038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN "tax_type_code" varchar(16)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "fk_products_tax_type"
         FOREIGN KEY ("tax_type_code") REFERENCES "tax_types" ("code") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_products_tax_type" ON "products" ("tax_type_code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "ix_products_tax_type"`);
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "fk_products_tax_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "tax_type_code"`,
    );
  }
}
