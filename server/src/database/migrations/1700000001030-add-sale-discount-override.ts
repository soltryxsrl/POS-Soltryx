import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Auditoría de descuentos altos: registra qué usuario autorizó un descuento
 * que excede el umbral configurado (`DISCOUNT_OVERRIDE_THRESHOLD_PCT`).
 *
 * Si el cajero no tiene `sales.discount.override`, debe escalar a un manager;
 * el cliente envía las credenciales del manager y el server las valida e indica
 * en este campo quién aprobó. Si el descuento NO supera el umbral, queda null.
 */
export class AddSaleDiscountOverride1700000001030 implements MigrationInterface {
  name = 'AddSaleDiscountOverride1700000001030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales" ADD COLUMN "discount_authorized_by_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" ADD CONSTRAINT "fk_sale_discount_authorizer" FOREIGN KEY ("discount_authorized_by_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "fk_sale_discount_authorizer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" DROP COLUMN IF EXISTS "discount_authorized_by_id"`,
    );
  }
}
