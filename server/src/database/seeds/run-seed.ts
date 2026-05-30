import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../data-source';

/**
 * Seed mínimo para Fase 1:
 *   - 3 roles base (ADMIN, MANAGER, CASHIER)
 *   - 1 usuario admin (admin@t1et.local / Admin123!)
 *   - 1 categoría por defecto ("General")
 *   - 1 caja registradora ("Caja 1")
 *
 * Idempotente: si los registros ya existen, no los duplica.
 */
async function run(): Promise<void> {
  await AppDataSource.initialize();
  // eslint-disable-next-line no-console
  console.log('[seed] DataSource initialized');

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
