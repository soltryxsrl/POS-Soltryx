import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabla `business_settings`: configuración del negocio editable por UI.
 *
 * Singleton row (id = 1, forzado por CHECK). Sustituye los env vars
 * BUSINESS_* que existían en la versión anterior.
 *
 * Se crea pre-poblada con valores por defecto razonables, de forma que el
 * receipt nunca queda sin header aunque el admin no haya entrado a la UI.
 */
export class CreateBusinessSettings1700000001008 implements MigrationInterface {
  name = 'CreateBusinessSettings1700000001008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "business_settings" (
        "id"            smallint     PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
        "name"          varchar(180) NOT NULL DEFAULT 'T1ET POS',
        "legal_name"    varchar(180) NOT NULL DEFAULT '',
        "rnc"           varchar(32)  NOT NULL DEFAULT '',
        "address"       varchar(255) NOT NULL DEFAULT '',
        "phone"         varchar(64)  NOT NULL DEFAULT '',
        "footer_note"   varchar(255) NOT NULL DEFAULT '*** Gracias por su compra ***',
        "updated_at"    timestamptz  NOT NULL DEFAULT now(),
        "updated_by_id" uuid,
        CONSTRAINT "fk_business_settings_updated_by"
          FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `INSERT INTO "business_settings" ("id") VALUES (1) ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "business_settings"`);
  }
}
