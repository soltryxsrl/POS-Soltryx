import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Promociones targetables por variante específica.
 *
 * `promotions.variant_id` opcional: si está seteado, la promo aplica SOLO a esa
 * variante. Cuando se setea junto a `product_id`, debe coincidir con ese
 * producto padre (no enforzamos a nivel DB, sí en application).
 */
export class AddPromotionVariant1700000001027 implements MigrationInterface {
  name = 'AddPromotionVariant1700000001027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "promotions" ADD COLUMN "variant_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotions" ADD CONSTRAINT "fk_promotion_variant" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_promotion_variant" ON "promotions" ("variant_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "promotions" DROP CONSTRAINT IF EXISTS "fk_promotion_variant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotions" DROP COLUMN IF EXISTS "variant_id"`,
    );
  }
}
