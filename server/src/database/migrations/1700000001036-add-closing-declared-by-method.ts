import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cuadre por forma de pago al cierre: el cajero declara cuánto contó / vio
 * en cada método (CASH físico, CARD por batch del POS de tarjeta, TRANSFER
 * por extracto bancario, etc.). El sistema calcula diferencia vs lo
 * registrado en el POS.
 *
 * Estructura del jsonb: `{ "CASH": "500.00", "CARD": "300.00", "TRANSFER": "0.00" }`.
 * Si un método no está en el mapa, se asume declared = sistema (sin diferencia).
 */
export class AddClosingDeclaredByMethod1700000001036
  implements MigrationInterface
{
  name = 'AddClosingDeclaredByMethod1700000001036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cash_sessions" ADD COLUMN "closing_declared_by_method" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cash_sessions" DROP COLUMN IF EXISTS "closing_declared_by_method"`,
    );
  }
}
