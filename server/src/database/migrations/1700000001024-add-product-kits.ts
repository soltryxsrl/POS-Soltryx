import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Kits / Combos:
 *   - `products.is_kit`: marca un producto como "combo". Su precio/ITBIS sigue
 *     siendo el del producto kit (lo que aparece al cliente), pero el stock
 *     que se descuenta al venderlo es el de sus COMPONENTES.
 *   - `product_kit_components`: receta del kit. Cada fila representa una
 *     cantidad de un producto-componente que se entrega al vender 1 kit.
 *
 * Ejemplo: kit "Combo desayuno" (1 unidad) compuesto por:
 *   - 1× huevo
 *   - 2× tostada
 *   - 1× café
 * Vender 1 combo → SALE movement por cada componente (1 huevo, 2 tostadas, 1 café).
 *
 * Restricciones:
 *   - No anidamos kits (un componente NO puede ser otro kit). Enforzado en
 *     application layer en CreateSaleUseCase + endpoint para añadir componentes.
 *   - Un kit puede tener N componentes; un componente puede aparecer en N kits.
 *   - UNIQUE(kit, componente) — la cantidad acumulada va en `quantity`.
 */
export class AddProductKits1700000001024 implements MigrationInterface {
  name = 'AddProductKits1700000001024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN "is_kit" boolean NOT NULL DEFAULT false`,
    );

    await queryRunner.query(`
      CREATE TABLE "product_kit_components" (
        "id"                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "kit_product_id"        uuid NOT NULL,
        "component_product_id"  uuid NOT NULL,
        "quantity"              numeric(14,3) NOT NULL,
        "created_at"            timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_kit_components_kit" FOREIGN KEY ("kit_product_id")
          REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_kit_components_component" FOREIGN KEY ("component_product_id")
          REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "uq_kit_component" UNIQUE ("kit_product_id", "component_product_id"),
        CONSTRAINT "ck_kit_component_qty_positive" CHECK ("quantity" > 0),
        CONSTRAINT "ck_kit_component_not_self" CHECK ("kit_product_id" <> "component_product_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_kit_components_kit" ON "product_kit_components" ("kit_product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_kit_components_component" ON "product_kit_components" ("component_product_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "product_kit_components"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "is_kit"`);
  }
}
