import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Snapshot del COSTO unitario al momento de la venta. Con costo promedio móvil
 * el costo del producto cambia con cada recibo, así que para que el margen
 * histórico sea exacto guardamos el costo vigente en cada línea de venta.
 * Nullable: ventas previas no lo tienen (los reportes hacen fallback al costo
 * actual del producto).
 */
export class AddSaleItemCostSnapshot1700000001048 implements MigrationInterface {
  name = 'AddSaleItemCostSnapshot1700000001048';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "sale_items" ADD COLUMN "unit_cost_snapshot" numeric(12,2)`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "sale_items" DROP COLUMN IF EXISTS "unit_cost_snapshot"`,
    );
  }
}
