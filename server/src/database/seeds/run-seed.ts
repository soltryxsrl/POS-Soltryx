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

    // Catálogo DGII de tipos de comprobante. Se siembra siempre con UPSERT
    // para que renombrar el `name`/`description` en código se refleje al re-seed.
    const FISCAL_DOC_TYPES = [
      // --- e-CF (sistema electrónico DGII) ---
      { code: 'E31', name: 'Factura de Crédito Fiscal (e-CF)', description: 'Facturación a contribuyentes con RNC (B2B). El comprador acredita ITBIS.', isActive: true,  requiresBuyerRnc: true,  appliesTo: 'SALE' },
      { code: 'E32', name: 'Factura de Consumo (e-CF)',         description: 'Venta al consumidor final (B2C). RNC opcional.',                          isActive: true,  requiresBuyerRnc: false, appliesTo: 'SALE' },
      { code: 'E33', name: 'Nota de Débito (e-CF)',             description: 'Ajustes positivos a una factura ya emitida.',                              isActive: true,  requiresBuyerRnc: false, appliesTo: 'SALE' },
      { code: 'E34', name: 'Nota de Crédito (e-CF)',            description: 'Devoluciones y descuentos posteriores a una factura.',                     isActive: true,  requiresBuyerRnc: false, appliesTo: 'SALE' },
      { code: 'E41', name: 'Comprobante de Compras (e-CF)',     description: 'Compras a proveedores informales sin NCF propio.',                         isActive: true,  requiresBuyerRnc: false, appliesTo: 'PURCHASE' },
      { code: 'E42', name: 'Pagos al Exterior (e-CF)',          description: 'Pagos a entidades en el extranjero.',                                      isActive: false, requiresBuyerRnc: false, appliesTo: 'PURCHASE' },
      { code: 'E43', name: 'Gastos Menores (e-CF)',             description: 'Gastos pequeños sin comprobante formal del proveedor.',                    isActive: true,  requiresBuyerRnc: false, appliesTo: 'PURCHASE' },
      { code: 'E44', name: 'Régimen Especial (e-CF)',           description: 'Comprobante para contribuyentes en régimen especial (ej. zonas francas).', isActive: false, requiresBuyerRnc: false, appliesTo: 'SALE' },
      { code: 'E45', name: 'Gubernamental (e-CF)',              description: 'Facturación a entidades del Estado.',                                      isActive: false, requiresBuyerRnc: true,  appliesTo: 'SALE' },
      // --- NCF tradicional (pre-electrónico, sigue válido durante la transición) ---
      { code: 'B01', name: 'Factura de Crédito Fiscal',         description: 'NCF tradicional para contribuyentes con RNC (B2B).',                       isActive: true,  requiresBuyerRnc: true,  appliesTo: 'SALE' },
      { code: 'B02', name: 'Factura de Consumo',                description: 'NCF tradicional para consumidor final (B2C). RNC opcional.',               isActive: true,  requiresBuyerRnc: false, appliesTo: 'SALE' },
      { code: 'B03', name: 'Nota de Débito',                    description: 'Ajustes positivos a una factura NCF tradicional.',                         isActive: true,  requiresBuyerRnc: false, appliesTo: 'SALE' },
      { code: 'B04', name: 'Nota de Crédito',                   description: 'Devoluciones / descuentos a una factura NCF tradicional.',                 isActive: true,  requiresBuyerRnc: false, appliesTo: 'SALE' },
      { code: 'B11', name: 'Proveedor Informal',                description: 'Compras a proveedores sin NCF (registro deductivo).',                      isActive: false, requiresBuyerRnc: false, appliesTo: 'PURCHASE' },
      { code: 'B13', name: 'Gastos Menores',                    description: 'Gastos pequeños sin comprobante (alternativa a E43).',                     isActive: false, requiresBuyerRnc: false, appliesTo: 'PURCHASE' },
      { code: 'B14', name: 'Régimen Especial',                  description: 'Contribuyentes en régimen especial (NCF tradicional).',                    isActive: false, requiresBuyerRnc: false, appliesTo: 'SALE' },
      { code: 'B15', name: 'Gubernamental',                     description: 'Facturación a entidades del Estado (NCF tradicional).',                    isActive: false, requiresBuyerRnc: true,  appliesTo: 'SALE' },
      { code: 'B16', name: 'Exportaciones',                     description: 'Ventas al exterior (NCF tradicional).',                                    isActive: false, requiresBuyerRnc: false, appliesTo: 'SALE' },
    ];
    for (const t of FISCAL_DOC_TYPES) {
      await m.query(
        `INSERT INTO fiscal_doc_types (code, name, description, is_active, requires_buyer_rnc, applies_to)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name,
             description = EXCLUDED.description,
             requires_buyer_rnc = EXCLUDED.requires_buyer_rnc,
             applies_to = EXCLUDED.applies_to`,
        [t.code, t.name, t.description, t.isActive, t.requiresBuyerRnc, t.appliesTo],
      );
    }
    // eslint-disable-next-line no-console
    console.log(`[seed] ${FISCAL_DOC_TYPES.length} fiscal doc types ensured`);

    // Secuencias NCF de prueba para los tipos de venta más usados. En PROD el
    // dueño crea sus propios rangos desde /dashboard/impuestos/secuencias.
    // En desarrollo, sembrar permite probar el flujo end-to-end sin paso manual.
    // Solo insertamos si NO existe ya una secuencia activa para el (docType,prefix).
    const DEFAULT_SEQUENCES = [
      { docType: 'E32', prefix: 'E32', rangeFrom: '1',  rangeTo: '1000' }, // Factura consumo e-CF
      { docType: 'E31', prefix: 'E31', rangeFrom: '1',  rangeTo: '500'  }, // Crédito fiscal e-CF
      { docType: 'E34', prefix: 'E34', rangeFrom: '1',  rangeTo: '200'  }, // Nota crédito e-CF
      { docType: 'B02', prefix: 'B02', rangeFrom: '1',  rangeTo: '1000' }, // Factura consumo NCF
      { docType: 'B01', prefix: 'B01', rangeFrom: '1',  rangeTo: '500'  }, // Crédito fiscal NCF
      { docType: 'B04', prefix: 'B04', rangeFrom: '1',  rangeTo: '200'  }, // Nota crédito NCF
      { docType: 'E41', prefix: 'E41', rangeFrom: '1',  rangeTo: '200'  }, // Compras informales e-CF
      { docType: 'E43', prefix: 'E43', rangeFrom: '1',  rangeTo: '200'  }, // Gastos menores e-CF
      { docType: 'B11', prefix: 'B11', rangeFrom: '1',  rangeTo: '200'  }, // Compras informales NCF
      { docType: 'B13', prefix: 'B13', rangeFrom: '1',  rangeTo: '200'  }, // Gastos menores NCF
    ];
    let newSequences = 0;
    for (const s of DEFAULT_SEQUENCES) {
      const existing = await m.query(
        `SELECT id FROM fiscal_sequences WHERE doc_type = $1 AND prefix = $2 AND is_active = true LIMIT 1`,
        [s.docType, s.prefix],
      );
      if (existing.length > 0) continue;
      await m.query(
        `INSERT INTO fiscal_sequences (doc_type, prefix, range_from, range_to, next_number, valid_until, is_active)
         VALUES ($1, $2, $3, $4, $3, '2099-12-31', true)`,
        [s.docType, s.prefix, s.rangeFrom, s.rangeTo],
      );
      newSequences += 1;
    }
    // eslint-disable-next-line no-console
    console.log(
      `[seed] fiscal sequences: ${newSequences} new (skipped ${DEFAULT_SEQUENCES.length - newSequences} ya existentes)`,
    );

    // Monedas básicas. DOP es la base del sistema. USD se incluye desactivado
    // por defecto — el dueño lo activa desde Configuración cuando lo necesite.
    const CURRENCIES = [
      { code: 'DOP', name: 'Peso Dominicano', symbol: 'RD$', decimals: 2, isActive: true, isBase: true },
      { code: 'USD', name: 'Dólar Estadounidense', symbol: 'US$', decimals: 2, isActive: false, isBase: false },
      { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, isActive: false, isBase: false },
    ];
    for (const c of CURRENCIES) {
      await m.query(
        `INSERT INTO currencies (code, name, symbol, decimals, is_active, is_base)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name,
             symbol = EXCLUDED.symbol,
             decimals = EXCLUDED.decimals`,
        [c.code, c.name, c.symbol, c.decimals, c.isActive, c.isBase],
      );
    }
    // Tasa inicial USD→DOP (referencial, el dueño la actualiza). EUR sin tasa.
    await m.query(
      `INSERT INTO exchange_rates (currency_code, rate_to_base)
       VALUES ('USD', 60.00)
       ON CONFLICT (currency_code) DO NOTHING`,
    );
    // eslint-disable-next-line no-console
    console.log(`[seed] ${CURRENCIES.length} currencies ensured (DOP base)`);

    // Tipos de ITBIS (tasas legales DGII). El UPSERT actualiza name/rate/orden
    // pero NO toca is_active/is_default para preservar lo que el dueño escogió.
    const TAX_TYPES = [
      { code: 'ITBIS18', name: 'ITBIS 18%',                  rate: '18.00', isExempt: false, isActive: true, isDefault: true,  sortOrder: 1 },
      { code: 'ITBIS16', name: 'ITBIS 16% (tasa reducida)',  rate: '16.00', isExempt: false, isActive: true, isDefault: false, sortOrder: 2 },
      { code: 'ITBIS0',  name: 'Tasa cero (0%)',             rate: '0.00',  isExempt: false, isActive: true, isDefault: false, sortOrder: 3 },
      { code: 'EXENTO',  name: 'Exento',                     rate: '0.00',  isExempt: true,  isActive: true, isDefault: false, sortOrder: 4 },
    ];
    for (const t of TAX_TYPES) {
      await m.query(
        `INSERT INTO tax_types (code, name, rate, is_exempt, is_active, is_default, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name,
             rate = EXCLUDED.rate,
             is_exempt = EXCLUDED.is_exempt,
             sort_order = EXCLUDED.sort_order`,
        [t.code, t.name, t.rate, t.isExempt, t.isActive, t.isDefault, t.sortOrder],
      );
    }
    // eslint-disable-next-line no-console
    console.log(`[seed] ${TAX_TYPES.length} tax types ensured (ITBIS 18/16/0/Exento)`);

    // Backfill: enlaza productos existentes a un tipo de ITBIS según su tasa.
    // Solo toca filas sin tipo asignado (idempotente). Tasas no estándar quedan
    // en null y el dueño elige el tipo al editar el producto.
    await m.query(`
      UPDATE products SET tax_type_code = CASE
        WHEN tax_rate = 18 THEN 'ITBIS18'
        WHEN tax_rate = 16 THEN 'ITBIS16'
        WHEN tax_rate = 0  THEN 'ITBIS0'
        ELSE tax_type_code
      END
      WHERE tax_type_code IS NULL
    `);
    // eslint-disable-next-line no-console
    console.log('[seed] products backfilled with tax_type_code (by rate)');

    // Formas de pago. `code` ES la clase de comportamiento. UPSERT preserva
    // activo/default/orden y el nombre que el dueño haya personalizado... salvo
    // primera siembra. (Para no pisar renames, solo seteamos name si la fila es nueva.)
    const PAYMENT_METHODS = [
      { code: 'CASH',     name: 'Efectivo',       requiresReference: false, isActive: true, isDefault: true,  sortOrder: 1 },
      { code: 'CARD',     name: 'Tarjeta',        requiresReference: true,  isActive: true, isDefault: false, sortOrder: 2 },
      { code: 'TRANSFER', name: 'Transferencia',  requiresReference: true,  isActive: true, isDefault: false, sortOrder: 3 },
      { code: 'ACCOUNT',  name: 'Crédito',        requiresReference: false, isActive: true, isDefault: false, sortOrder: 4 },
      { code: 'OTHER',    name: 'Otro',           requiresReference: false, isActive: true, isDefault: false, sortOrder: 5 },
    ];
    for (const pm of PAYMENT_METHODS) {
      await m.query(
        `INSERT INTO payment_methods (code, name, requires_reference, is_active, is_default, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO NOTHING`,
        [pm.code, pm.name, pm.requiresReference, pm.isActive, pm.isDefault, pm.sortOrder],
      );
    }
    // eslint-disable-next-line no-console
    console.log(`[seed] ${PAYMENT_METHODS.length} payment methods ensured`);
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
