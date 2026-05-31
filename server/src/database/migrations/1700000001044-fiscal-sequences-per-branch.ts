import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * NCF por sucursal: la unicidad de "secuencia activa" pasa de
 * (doc_type, prefix) a (branch_id, doc_type, prefix). Así cada sucursal lleva
 * sus propios rangos NCF por tipo de comprobante (requerido por DGII cuando
 * la empresa tiene varios locales). `branch_id` ya es NOT NULL + FK desde 043.
 */
export class FiscalSequencesPerBranch1700000001044 implements MigrationInterface {
  name = 'FiscalSequencesPerBranch1700000001044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_fiscal_sequences_doc_type_prefix"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_fiscal_sequences_branch_doc_type_prefix"
       ON "fiscal_sequences"("branch_id", "doc_type", "prefix")
       WHERE "is_active" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_fiscal_sequences_branch_doc_type_prefix"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_fiscal_sequences_doc_type_prefix"
       ON "fiscal_sequences"("doc_type", "prefix")
       WHERE "is_active" = true`,
    );
  }
}
