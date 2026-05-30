import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Habilita "venta de monto libre" / ítem genérico: una línea de venta SIN
 * producto del catálogo (el cajero teclea descripción + precio + ITBIS).
 *
 * Solo se relaja `product_id` a NULL. El FK `fk_si_product` sigue vigente para
 * las líneas que SÍ referencian un producto (un FK permite NULL sin problema).
 */
export class AllowOpenSaleItems1700000001042 implements MigrationInterface {
  name = 'AllowOpenSaleItems1700000001042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sale_items" ALTER COLUMN "product_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Si ya existen líneas abiertas (product_id NULL) esto fallará — es
    // intencional: no se puede revertir sin decidir qué hacer con esas ventas.
    await queryRunner.query(
      `ALTER TABLE "sale_items" ALTER COLUMN "product_id" SET NOT NULL`,
    );
  }
}
