import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Snapshot del nombre del autorizador del descuento (siguiendo el patrón de
 * `productNameSnapshot` en sale_items). Evita un lookup en `/users/:id` desde
 * la UI cuando el cajero abre el detalle de venta — y mantiene el dato robusto
 * frente a renombrados o eliminación posterior del usuario autorizador.
 */
export class AddSaleDiscountAuthorizerSnapshot1700000001031
  implements MigrationInterface
{
  name = 'AddSaleDiscountAuthorizerSnapshot1700000001031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales" ADD COLUMN "discount_authorized_by_snapshot" varchar(180)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales" DROP COLUMN IF EXISTS "discount_authorized_by_snapshot"`,
    );
  }
}
