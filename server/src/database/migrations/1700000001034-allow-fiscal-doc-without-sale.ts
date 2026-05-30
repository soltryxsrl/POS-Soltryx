import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Permite emitir comprobantes fiscales que NO están ligados a una venta:
 *   - E41 / B11 — Compras a proveedores informales (sin NCF propio)
 *   - E43 / B13 — Gastos menores sin comprobante formal
 *
 * Para estos casos `sale_id` queda NULL y el comprobante representa una
 * "auto-emisión" del negocio. Se reporta en el 606 al lado de las compras
 * formales que sí tienen NCF del proveedor.
 *
 * Las ventas (B01-B04 / E31-E34) siguen requiriendo sale_id — la validación
 * la hace el application layer (FiscalDocumentsService).
 */
export class AllowFiscalDocWithoutSale1700000001034 implements MigrationInterface {
  name = 'AllowFiscalDocWithoutSale1700000001034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fiscal_documents" ALTER COLUMN "sale_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Solo posible si no hay rows con sale_id NULL. El revert manual es
    // responsabilidad de quien lo ejecute.
    await queryRunner.query(
      `ALTER TABLE "fiscal_documents" ALTER COLUMN "sale_id" SET NOT NULL`,
    );
  }
}
