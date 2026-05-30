import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Captura datos fiscales DGII en órdenes de compra para poder generar el 606.
 *
 *   - `supplier_fiscal_doc_type_code` — código del tipo (B01/B14/B11/B13/E41/E43).
 *     Null = compra sin NCF (gasto no fiscal, no entra en 606).
 *   - `supplier_ncf` — NCF que aparece en la factura del proveedor.
 *   - `supplier_invoice_date` — fecha del comprobante del proveedor (la que va al 606).
 *
 * El campo existente `supplier_invoice` se mantiene como referencia interna
 * (algunos negocios usan número propio o nota del proveedor sin NCF).
 */
export class AddPurchaseFiscalFields1700000001033 implements MigrationInterface {
  name = 'AddPurchaseFiscalFields1700000001033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" ADD COLUMN "supplier_fiscal_doc_type_code" varchar(4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" ADD COLUMN "supplier_ncf" varchar(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" ADD COLUMN "supplier_invoice_date" date`,
    );
    // Índice para el reporte 606 (filtra por fecha de comprobante).
    await queryRunner.query(
      `CREATE INDEX "ix_po_supplier_invoice_date" ON "purchase_orders" ("supplier_invoice_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_po_supplier_ncf" ON "purchase_orders" ("supplier_ncf") WHERE "supplier_ncf" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "ix_po_supplier_ncf"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "ix_po_supplier_invoice_date"`);
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "supplier_invoice_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "supplier_ncf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "supplier_fiscal_doc_type_code"`,
    );
  }
}
