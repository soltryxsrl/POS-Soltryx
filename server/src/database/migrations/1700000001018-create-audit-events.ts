import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Audit log centralizado: bitácora inmutable de acciones sensibles del sistema.
 *
 * Cada fila documenta UN evento:
 *   - actor_user_id: quién (puede ser null para acciones del sistema)
 *   - action: código tipo `module.verb`, ej. "sales.cancel", "auth.login.success"
 *   - entity_type: "sale", "customer", "purchase_order", "user", etc.
 *   - entity_id: el UUID del objeto afectado (puede ser null para eventos globales)
 *   - payload: detalles arbitrarios en JSON (motivo, cambios diff, etc.)
 *   - ip / user_agent: trazabilidad del request
 *
 * No tiene FK al actor para que el log sobreviva si se elimina el usuario.
 * Append-only en código (no se actualiza ni borra).
 */
export class CreateAuditEvents1700000001018 implements MigrationInterface {
  name = 'CreateAuditEvents1700000001018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_events" (
        "id"             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "actor_user_id"  uuid,
        "actor_name"     varchar(180),
        "action"         varchar(64)  NOT NULL,
        "entity_type"    varchar(64),
        "entity_id"      uuid,
        "payload"        jsonb,
        "ip"             varchar(64),
        "user_agent"     varchar(255),
        "created_at"     timestamptz  NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_audit_created_at" ON "audit_events"("created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_audit_action_created" ON "audit_events"("action", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_audit_entity" ON "audit_events"("entity_type", "entity_id") WHERE "entity_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_audit_actor" ON "audit_events"("actor_user_id", "created_at" DESC) WHERE "actor_user_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_events"`);
  }
}
