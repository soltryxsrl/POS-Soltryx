import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Token público para compartir recibo sin requerir login.
 *
 * Cada venta tiene un UUID separado del `id` que se usa en URLs públicas
 * tipo `/r/{token}`. No se pueden enumerar (UUID v4) y no exponen el ID
 * interno. El cliente puede ver, imprimir o compartir el recibo sin
 * autenticarse — útil para WhatsApp, email, "manda el ticket por mensaje".
 *
 * Backfill: cada venta existente recibe un token nuevo.
 */
export class AddSalePublicToken1700000001021 implements MigrationInterface {
  name = 'AddSalePublicToken1700000001021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales" ADD COLUMN "public_token" uuid NOT NULL DEFAULT gen_random_uuid()`,
    );
    // Backfill por seguridad (DEFAULT cubre filas nuevas; las viejas también
    // reciben uno porque ADD COLUMN ... NOT NULL DEFAULT evalúa el default por fila).
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_sales_public_token" ON "sales"("public_token")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_sales_public_token"`);
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN IF EXISTS "public_token"`);
  }
}
