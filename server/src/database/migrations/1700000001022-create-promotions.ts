import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Promociones aplicables automáticamente en POS.
 *
 * Tipos:
 *   PRODUCT_PERCENT_OFF  — % off sobre cada unidad de un producto / categoría
 *   PRODUCT_AMOUNT_OFF   — RD$ off sobre cada unidad de un producto / categoría
 *   PRODUCT_BUY_X_GET_Y  — "2x1": compra X, lleva Y gratis (Y < X)
 *   ORDER_PERCENT_OFF    — % off sobre el subtotal de la orden (con min_order_total opcional)
 *   ORDER_AMOUNT_OFF     — RD$ off sobre la orden (con min_order_total opcional)
 *
 * Scope (para tipos PRODUCT_*):
 *   - product_id   → aplica a un producto específico
 *   - category_id  → aplica a todos los productos de una categoría
 *   - (ninguno)    → aplica a TODOS los productos
 *
 * Auto-aplicación: si is_active=true y la promoción califica (fechas + scope +
 * cantidades), se aplica automáticamente al cobrar — el cajero no necesita
 * digitar código alguno. Las promociones se evalúan SERVER-side al crear la
 * venta y los descuentos resultantes se incorporan a sale_items.discount o
 * sale.order_discount según corresponda.
 */
export class CreatePromotions1700000001022 implements MigrationInterface {
  name = 'CreatePromotions1700000001022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "promotions" (
        "id"                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        "branch_id"         uuid,
        "name"              varchar(180)  NOT NULL,
        "description"       text,
        "type"              varchar(32)   NOT NULL,
        "product_id"        uuid,
        "category_id"       uuid,
        "percent_off"       numeric(5,2),
        "amount_off"        numeric(12,2),
        "min_quantity"      int,
        "free_quantity"     int,
        "min_order_total"   numeric(12,2),
        "valid_from"        timestamptz,
        "valid_until"       timestamptz,
        "is_active"         boolean       NOT NULL DEFAULT true,
        "priority"          int           NOT NULL DEFAULT 0,
        "created_at"        timestamptz   NOT NULL DEFAULT now(),
        "updated_at"        timestamptz   NOT NULL DEFAULT now(),
        "deleted_at"        timestamptz,
        CONSTRAINT "fk_promo_product"  FOREIGN KEY ("product_id")  REFERENCES "products"("id")   ON DELETE CASCADE,
        CONSTRAINT "fk_promo_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE,
        CONSTRAINT "ck_promo_type" CHECK ("type" IN (
          'PRODUCT_PERCENT_OFF',
          'PRODUCT_AMOUNT_OFF',
          'PRODUCT_BUY_X_GET_Y',
          'ORDER_PERCENT_OFF',
          'ORDER_AMOUNT_OFF'
        )),
        CONSTRAINT "ck_promo_percent" CHECK (
          "percent_off" IS NULL OR ("percent_off" > 0 AND "percent_off" <= 100)
        ),
        CONSTRAINT "ck_promo_amount" CHECK ("amount_off" IS NULL OR "amount_off" > 0),
        CONSTRAINT "ck_promo_bxgy" CHECK (
          ("type" <> 'PRODUCT_BUY_X_GET_Y') OR
          ("min_quantity" IS NOT NULL AND "free_quantity" IS NOT NULL
            AND "min_quantity" > "free_quantity" AND "free_quantity" > 0)
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_promo_active_dates" ON "promotions"("is_active", "valid_from", "valid_until") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_promo_product" ON "promotions"("product_id") WHERE "product_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_promo_category" ON "promotions"("category_id") WHERE "category_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "promotions"`);
  }
}
