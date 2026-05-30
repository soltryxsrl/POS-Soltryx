import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Conteo por denominación al abrir y cerrar caja.
 *
 * Formato (JSONB) keyed por denominación en pesos:
 *   { "2000": 0, "1000": 2, "500": 5, "200": 10, "100": 20,
 *     "50": 10, "25": 4, "10": 5, "5": 2, "1": 0 }
 *
 * El total se valida en el server (Σ denom × count = monto), no aquí.
 * Nullable: el conteo es opcional — el cajero puede saltarlo e ingresar
 * solo un total. Pero cuando llega, queda auditable.
 */
export class AddCashDenominations1700000001010 implements MigrationInterface {
  name = 'AddCashDenominations1700000001010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cash_sessions" ADD COLUMN "opening_denominations" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "cash_sessions" ADD COLUMN "closing_denominations" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cash_sessions" DROP COLUMN "closing_denominations"`);
    await queryRunner.query(`ALTER TABLE "cash_sessions" DROP COLUMN "opening_denominations"`);
  }
}
