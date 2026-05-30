import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Secuencia para generar `sale_number` de forma concurrente-segura.
 * Formato final: `S-NNNNNN` (6 dígitos con padding, crece automáticamente).
 */
export class CreateSalesSequence1700000001005 implements MigrationInterface {
  name = 'CreateSalesSequence1700000001005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS sales_number_seq START 1`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE IF EXISTS sales_number_seq`);
  }
}
