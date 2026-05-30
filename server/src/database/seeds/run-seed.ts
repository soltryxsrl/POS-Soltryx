import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../data-source';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from '../../modules/auth/domain/permissions.catalog';

/**
 * Seed base:
 *   - 3 roles (ADMIN, MANAGER, CASHIER)
 *   - Catálogo completo de permisos (idempotente)
 *   - Asignación de permisos a roles (ADMIN → todos, otros → catálogo por defecto)
 *   - Usuario admin (admin@t1et.local / Admin123!)
 *   - 1 categoría "General" y 1 caja "Caja 1"
 *
 * Idempotente: re-ejecutar no duplica nada. Re-aplica también las
 * asignaciones de permisos por si se agregaron al catálogo.
 */
async function run(): Promise<void> {
  await AppDataSource.initialize();
  // eslint-disable-next-line no-console
  console.log('[seed] DataSource initialized');

  // Aplica migraciones pendientes antes de sembrar (en deploy este script
  // corre antes que el API, así que las tablas pueden no existir todavía).
  const applied = await AppDataSource.runMigrations();
  // eslint-disable-next-line no-console
  console.log(`[seed] ${applied.length} migration(s) applied`);

  await AppDataSource.transaction(async (m) => {
    const roles = [
      { code: 'ADMIN', name: 'Administrador', description: 'Acceso total al sistema' },
      { code: 'MANAGER', name: 'Gerente', description: 'Gestión operativa y reportes' },
      { code: 'CASHIER', name: 'Cajero', description: 'Operación de caja y ventas' },
    ];
    for (const r of roles) {
      await m.query(
        `INSERT INTO roles (code, name, description) VALUES ($1, $2, $3)
         ON CONFLICT (code) DO NOTHING`,
        [r.code, r.name, r.description],
      );
    }
    // eslint-disable-next-line no-console
    console.log('[seed] roles ensured');

    for (const p of ALL_PERMISSIONS) {
      await m.query(
        `INSERT INTO permissions (code, name, module, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name, module = EXCLUDED.module, description = EXCLUDED.description`,
        [p.code, p.name, p.module, p.description ?? null],
      );
    }
    // eslint-disable-next-line no-console
    console.log(`[seed] ${ALL_PERMISSIONS.length} permissions ensured`);

    // ADMIN: todos los permisos
    await m.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.code = 'ADMIN'
      ON CONFLICT DO NOTHING
    `);

    // Otros roles: catálogo por defecto
    for (const [roleCode, codes] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      if (codes.length === 0) continue;
      await m.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id
         FROM roles r, permissions p
         WHERE r.code = $1 AND p.code = ANY($2::varchar[])
         ON CONFLICT DO NOTHING`,
        [roleCode, codes],
      );
    }
    // eslint-disable-next-line no-console
    console.log('[seed] role-permissions assigned');

    const passwordHash = await bcrypt.hash('Admin123!', 10);
    await m.query(
      `INSERT INTO users (email, username, full_name, password_hash, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (email) DO NOTHING`,
      ['admin@t1et.local', 'admin', 'Administrador', passwordHash],
    );

    const [admin] = await m.query<{ id: string }[]>(
      `SELECT id FROM users WHERE email = $1`,
      ['admin@t1et.local'],
    );
    const [adminRole] = await m.query<{ id: string }[]>(
      `SELECT id FROM roles WHERE code = $1`,
      ['ADMIN'],
    );
    if (admin && adminRole) {
      await m.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [admin.id, adminRole.id],
      );
    }
    // eslint-disable-next-line no-console
    console.log('[seed] admin user ensured (admin@t1et.local / Admin123!)');

    await m.query(
      `INSERT INTO categories (name, description)
       SELECT 'General', 'Categoría por defecto'
       WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'General')`,
    );
    // eslint-disable-next-line no-console
    console.log('[seed] default category ensured');

    await m.query(
      `INSERT INTO cash_registers (code, name, is_active)
       VALUES ('CR-001', 'Caja 1', true)
       ON CONFLICT (code) DO NOTHING`,
    );
    // eslint-disable-next-line no-console
    console.log('[seed] default cash register ensured (code=CR-001)');
  });

  await AppDataSource.destroy();
  // eslint-disable-next-line no-console
  console.log('[seed] done');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] failed', err);
  process.exit(1);
});
