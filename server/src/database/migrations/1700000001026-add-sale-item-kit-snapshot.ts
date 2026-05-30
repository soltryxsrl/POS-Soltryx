import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Snapshot histórico de la receta del kit al momento de la venta.
 *
 * Sin esto, si el dueño edita la receta del kit entre la venta y la anulación/
 * devolución, el reverso de stock usa la receta ACTUAL — incorrecto.
 *
 * Con `kit_components_snapshot` poblado al vender un kit, las cancelaciones y
 * devoluciones reversean exactamente lo que se descontó al vender.
 *
 * Formato: JSON array `[{ componentProductId, quantity }]`. NULL en líneas
 * que no fueron de kit.
 */
export class AddSaleItemKitSnapshot1700000001026 implements MigrationInterface {
  name = 'AddSaleItemKitSnapshot1700000001026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sale_items" ADD COLUMN "kit_components_snapshot" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sale_items" DROP COLUMN IF EXISTS "kit_components_snapshot"`,
    );
  }
}
