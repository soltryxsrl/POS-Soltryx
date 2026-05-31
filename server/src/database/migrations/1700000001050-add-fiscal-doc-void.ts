import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Anulación REAL de un comprobante (NCF quemado sin transacción) → reporte 608.
 * Distinto de la cancelación de venta (que emite nota de crédito y va al 607).
 *   - void_type: tipo de anulación DGII (01..09).
 *   - voided_at: fecha de la anulación.
 * Los comprobantes anulados se EXCLUYEN de 606/607 y aparecen solo en el 608.
 */
export class AddFiscalDocVoid1700000001050 implements MigrationInterface {
  name = 'AddFiscalDocVoid1700000001050';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "fiscal_documents" ADD COLUMN "voided_at" timestamptz`,
    );
    await q.query(
      `ALTER TABLE "fiscal_documents" ADD COLUMN "void_type" varchar(2)`,
    );
    await q.query(
      `CREATE INDEX "ix_fiscal_docs_voided" ON "fiscal_documents" ("branch_id", "voided_at") WHERE "voided_at" IS NOT NULL`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "ix_fiscal_docs_voided"`);
    await q.query(`ALTER TABLE "fiscal_documents" DROP COLUMN IF EXISTS "void_type"`);
    await q.query(`ALTER TABLE "fiscal_documents" DROP COLUMN IF EXISTS "voided_at"`);
  }
}
