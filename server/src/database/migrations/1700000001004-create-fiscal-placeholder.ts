import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Placeholder para facturación electrónica RD (e-CF DGII).
 *
 * Tipos de e-CF que soporta el modelo (DGII RD):
 *   31 - Factura de Crédito Fiscal Electrónica
 *   32 - Factura de Consumo Electrónica
 *   33 - Nota de Débito Electrónica
 *   34 - Nota de Crédito Electrónica
 */
export class CreateFiscalPlaceholder1700000001004 implements MigrationInterface {
  name = 'CreateFiscalPlaceholder1700000001004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "fiscal_sequences" (
        "id"               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "branch_id"        uuid,
        "doc_type"         varchar(4)   NOT NULL,
        "prefix"           varchar(8)   NOT NULL,
        "range_from"       bigint       NOT NULL,
        "range_to"         bigint       NOT NULL,
        "next_number"      bigint       NOT NULL,
        "valid_until"      date,
        "is_active"        boolean      NOT NULL DEFAULT true,
        "created_at"       timestamptz  NOT NULL DEFAULT now(),
        "updated_at"       timestamptz  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fiscal_documents" (
        "id"              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        "branch_id"       uuid,
        "sale_id"         uuid          NOT NULL,
        "doc_type"        varchar(4)    NOT NULL,
        "ncf"             varchar(32)   NOT NULL,
        "issue_date"      timestamptz   NOT NULL DEFAULT now(),
        "buyer_rnc"       varchar(16),
        "buyer_name"      varchar(180),
        "subtotal"        numeric(12,2) NOT NULL,
        "tax_total"       numeric(12,2) NOT NULL,
        "total"           numeric(12,2) NOT NULL,
        "status"          varchar(16)   NOT NULL DEFAULT 'PENDING',
        "track_id"        varchar(64),
        "xml_payload"     text,
        "xml_signed"      text,
        "qr_url"          varchar(255),
        "dgii_response"   jsonb,
        "submitted_at"    timestamptz,
        "accepted_at"     timestamptz,
        "rejected_at"     timestamptz,
        "rejection_reason" text,
        "created_at"      timestamptz   NOT NULL DEFAULT now(),
        "updated_at"      timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "fk_fd_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fiscal_document_items" (
        "id"                    uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
        "fiscal_document_id"    uuid           NOT NULL,
        "sequence"              int            NOT NULL,
        "description"           varchar(255)   NOT NULL,
        "quantity"              numeric(14,3)  NOT NULL,
        "unit_price"            numeric(12,2)  NOT NULL,
        "discount"              numeric(12,2)  NOT NULL DEFAULT 0,
        "tax_rate"              numeric(5,2)   NOT NULL DEFAULT 0,
        "tax_total"             numeric(12,2)  NOT NULL DEFAULT 0,
        "total"                 numeric(12,2)  NOT NULL,
        CONSTRAINT "fk_fdi_doc" FOREIGN KEY ("fiscal_document_id") REFERENCES "fiscal_documents"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fiscal_provider_logs" (
        "id"                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        "fiscal_document_id"  uuid,
        "operation"           varchar(32)   NOT NULL,
        "request_payload"     jsonb,
        "response_payload"    jsonb,
        "http_status"         int,
        "success"             boolean,
        "error_message"       text,
        "duration_ms"         int,
        "created_at"          timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "fk_fpl_doc" FOREIGN KEY ("fiscal_document_id") REFERENCES "fiscal_documents"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "sales" ADD CONSTRAINT "fk_sales_fiscal_document" FOREIGN KEY ("fiscal_document_id") REFERENCES "fiscal_documents"("id") ON DELETE SET NULL`,
    );

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_fiscal_documents_ncf" ON "fiscal_documents"("ncf")`);
    await queryRunner.query(`CREATE INDEX "ix_fiscal_documents_sale_id" ON "fiscal_documents"("sale_id")`);
    await queryRunner.query(`CREATE INDEX "ix_fiscal_documents_status" ON "fiscal_documents"("status")`);
    await queryRunner.query(`CREATE INDEX "ix_fiscal_documents_issue_date" ON "fiscal_documents"("issue_date" DESC)`);
    await queryRunner.query(`CREATE INDEX "ix_fiscal_document_items_doc_id" ON "fiscal_document_items"("fiscal_document_id")`);
    await queryRunner.query(`CREATE INDEX "ix_fiscal_provider_logs_doc_id" ON "fiscal_provider_logs"("fiscal_document_id")`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_fiscal_sequences_doc_type_prefix" ON "fiscal_sequences"("doc_type", "prefix") WHERE "is_active" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "fk_sales_fiscal_document"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_provider_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_document_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_sequences"`);
  }
}
