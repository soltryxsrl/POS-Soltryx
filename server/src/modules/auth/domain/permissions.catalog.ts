/**
 * Catálogo central de permisos del sistema (RBAC).
 * Códigos en formato `module.action`. Una sola fuente de verdad usada por:
 *   - seed (sembrar la tabla `permissions`)
 *   - decoradores `@RequirePermissions(...)`
 *   - frontend (`useHasPermission`, `<Can>`)
 *
 * Para agregar uno nuevo: añadirlo aquí, correr el seed para insertarlo
 * y asignarlo al/los rol(es) que correspondan en la sección de assignments.
 */

export interface PermissionDefinition {
  readonly code: string;
  readonly name: string;
  readonly module: string;
  readonly description?: string;
}

export const PERMISSIONS = {
  // --- Administración ---
  USERS_READ:    { code: 'users.read',    name: 'Ver usuarios',          module: 'users' },
  USERS_CREATE:  { code: 'users.create',  name: 'Crear usuarios',        module: 'users' },
  USERS_UPDATE:  { code: 'users.update',  name: 'Editar usuarios',       module: 'users' },
  USERS_DELETE:  { code: 'users.delete',  name: 'Eliminar usuarios',     module: 'users' },

  ROLES_READ:    { code: 'roles.read',    name: 'Ver roles',             module: 'roles' },
  ROLES_CREATE:  { code: 'roles.create',  name: 'Crear roles',           module: 'roles' },
  ROLES_UPDATE:  { code: 'roles.update',  name: 'Editar roles',          module: 'roles' },
  ROLES_DELETE:  { code: 'roles.delete',  name: 'Eliminar roles',        module: 'roles' },

  // --- Catálogo ---
  PRODUCTS_READ:    { code: 'products.read',    name: 'Ver productos',     module: 'products' },
  PRODUCTS_CREATE:  { code: 'products.create',  name: 'Crear productos',   module: 'products' },
  PRODUCTS_UPDATE:  { code: 'products.update',  name: 'Editar productos',  module: 'products' },
  PRODUCTS_DELETE:  { code: 'products.delete',  name: 'Eliminar productos', module: 'products' },

  CATEGORIES_READ:    { code: 'categories.read',    name: 'Ver categorías',     module: 'categories' },
  CATEGORIES_CREATE:  { code: 'categories.create',  name: 'Crear categorías',   module: 'categories' },
  CATEGORIES_UPDATE:  { code: 'categories.update',  name: 'Editar categorías',  module: 'categories' },
  CATEGORIES_DELETE:  { code: 'categories.delete',  name: 'Eliminar categorías', module: 'categories' },

  // --- Inventario ---
  INVENTORY_READ:   { code: 'inventory.read',   name: 'Ver inventario',       module: 'inventory' },
  INVENTORY_ADJUST: { code: 'inventory.adjust', name: 'Ajustar inventario',   module: 'inventory' },

  // --- Caja ---
  CASH_READ:   { code: 'cash.read',   name: 'Ver sesiones de caja', module: 'cash' },
  CASH_OPEN:   { code: 'cash.open',   name: 'Abrir caja',           module: 'cash' },
  CASH_CLOSE:  { code: 'cash.close',  name: 'Cerrar caja',          module: 'cash' },

  // --- Ventas / POS ---
  SALES_READ:    { code: 'sales.read',    name: 'Ver ventas',     module: 'sales' },
  SALES_CREATE:  { code: 'sales.create',  name: 'Crear ventas',   module: 'sales' },
  SALES_CANCEL:  { code: 'sales.cancel',  name: 'Anular ventas',  module: 'sales' },
  SALES_DISCOUNT_OVERRIDE: {
    code: 'sales.discount.override',
    name: 'Autorizar descuentos altos en venta',
    module: 'sales',
  },

  // --- Reportes ---
  REPORTS_READ: { code: 'reports.read', name: 'Ver reportes', module: 'reports' },

  // --- Configuración del negocio ---
  SETTINGS_READ:   { code: 'settings.read',   name: 'Ver configuración del negocio',  module: 'settings' },
  SETTINGS_UPDATE: { code: 'settings.update', name: 'Editar configuración del negocio', module: 'settings' },

  // --- Clientes y cuenta corriente (crédito) ---
  CUSTOMERS_READ:    { code: 'customers.read',    name: 'Ver clientes',           module: 'customers' },
  CUSTOMERS_CREATE:  { code: 'customers.create',  name: 'Crear clientes',         module: 'customers' },
  CUSTOMERS_UPDATE:  { code: 'customers.update',  name: 'Editar clientes',        module: 'customers' },
  CUSTOMERS_DELETE:  { code: 'customers.delete',  name: 'Eliminar clientes',      module: 'customers' },

  ACCOUNT_READ:    { code: 'account.read',    name: 'Ver cuenta corriente / crédito',   module: 'account' },
  ACCOUNT_PAYMENT: { code: 'account.payment', name: 'Registrar abonos al crédito',      module: 'account' },

  // --- Proveedores ---
  SUPPLIERS_READ:    { code: 'suppliers.read',    name: 'Ver proveedores',      module: 'suppliers' },
  SUPPLIERS_CREATE:  { code: 'suppliers.create',  name: 'Crear proveedores',    module: 'suppliers' },
  SUPPLIERS_UPDATE:  { code: 'suppliers.update',  name: 'Editar proveedores',   module: 'suppliers' },
  SUPPLIERS_DELETE:  { code: 'suppliers.delete',  name: 'Eliminar proveedores', module: 'suppliers' },

  // --- Compras (purchase orders) ---
  PURCHASES_READ:    { code: 'purchases.read',    name: 'Ver órdenes de compra',     module: 'purchases' },
  PURCHASES_CREATE:  { code: 'purchases.create',  name: 'Crear órdenes de compra',   module: 'purchases' },
  PURCHASES_RECEIVE: { code: 'purchases.receive', name: 'Recibir órdenes de compra', module: 'purchases' },
  PURCHASES_CANCEL:  { code: 'purchases.cancel',  name: 'Cancelar órdenes de compra', module: 'purchases' },

  // --- Auditoría ---
  AUDIT_READ: { code: 'audit.read', name: 'Ver bitácora de auditoría', module: 'audit' },

  // --- Returns / devoluciones de venta ---
  RETURNS_READ:   { code: 'returns.read',   name: 'Ver devoluciones',     module: 'returns' },
  RETURNS_CREATE: { code: 'returns.create', name: 'Registrar devoluciones', module: 'returns' },

  // --- Fiscal RD (DGII / e-CF) ---
  FISCAL_TYPES_READ:       { code: 'fiscal.types.read',       name: 'Ver catálogo de tipos de comprobante', module: 'fiscal' },
  FISCAL_TYPES_MANAGE:     { code: 'fiscal.types.manage',     name: 'Activar/desactivar tipos de comprobante', module: 'fiscal' },
  FISCAL_SEQUENCES_READ:   { code: 'fiscal.sequences.read',   name: 'Ver secuencias fiscales (NCF)',         module: 'fiscal' },
  FISCAL_SEQUENCES_MANAGE: { code: 'fiscal.sequences.manage', name: 'Crear / renovar secuencias fiscales',   module: 'fiscal' },
  FISCAL_DOCS_READ:        { code: 'fiscal.docs.read',        name: 'Ver comprobantes fiscales emitidos',    module: 'fiscal' },
  FISCAL_DOCS_ISSUE:       { code: 'fiscal.docs.issue',       name: 'Emitir comprobantes fiscales',          module: 'fiscal' },
  FISCAL_PURCHASES_CREATE: { code: 'fiscal.purchases.create', name: 'Registrar comprobantes de compra (E41/E43)', module: 'fiscal' },
  FISCAL_REPORTS_READ:     { code: 'fiscal.reports.read',     name: 'Generar reportes 606/607',              module: 'fiscal' },

  // --- Promociones ---
  PROMOTIONS_READ:   { code: 'promotions.read',   name: 'Ver promociones',     module: 'promotions' },
  PROMOTIONS_CREATE: { code: 'promotions.create', name: 'Crear promociones',   module: 'promotions' },
  PROMOTIONS_UPDATE: { code: 'promotions.update', name: 'Editar promociones',  module: 'promotions' },
  PROMOTIONS_DELETE: { code: 'promotions.delete', name: 'Eliminar promociones', module: 'promotions' },

  // --- Monedas / multi-currency ---
  CURRENCIES_READ:   { code: 'currencies.read',   name: 'Ver monedas y tasas',         module: 'currencies' },
  CURRENCIES_MANAGE: { code: 'currencies.manage', name: 'Activar y actualizar tasas',  module: 'currencies' },

  // --- Tipos de ITBIS (tasas de impuesto) ---
  TAX_TYPES_READ:    { code: 'tax-types.read',    name: 'Ver tipos de ITBIS',          module: 'tax-types' },
  TAX_TYPES_MANAGE:  { code: 'tax-types.manage',  name: 'Activar tipos de ITBIS y fijar el default', module: 'tax-types' },

  // --- Formas de pago ---
  PAYMENT_METHODS_READ:   { code: 'payment-methods.read',   name: 'Ver formas de pago',                 module: 'payment-methods' },
  PAYMENT_METHODS_MANAGE: { code: 'payment-methods.manage', name: 'Configurar formas de pago (nombre, referencia, default)', module: 'payment-methods' },

  // --- Sucursales (multi-branch) ---
  BRANCHES_READ:   { code: 'branches.read',   name: 'Ver sucursales',      module: 'branches' },
  BRANCHES_CREATE: { code: 'branches.create', name: 'Crear sucursales',    module: 'branches' },
  BRANCHES_UPDATE: { code: 'branches.update', name: 'Editar sucursales',   module: 'branches' },
  BRANCHES_DELETE: { code: 'branches.delete', name: 'Eliminar sucursales', module: 'branches' },
  BRANCHES_SWITCH: { code: 'branches.switch', name: 'Cambiar de sucursal activa (ver todas)', module: 'branches' },
} as const satisfies Record<string, PermissionDefinition>;

export const ALL_PERMISSIONS: readonly PermissionDefinition[] = Object.values(PERMISSIONS);

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]['code'];

/**
 * Asignaciones por defecto que aplica el seed.
 * ADMIN obtiene todos los permisos automáticamente (no listado aquí).
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, readonly PermissionCode[]> = {
  MANAGER: [
    PERMISSIONS.PRODUCTS_READ.code,
    PERMISSIONS.PRODUCTS_CREATE.code,
    PERMISSIONS.PRODUCTS_UPDATE.code,
    PERMISSIONS.PRODUCTS_DELETE.code,
    PERMISSIONS.CATEGORIES_READ.code,
    PERMISSIONS.CATEGORIES_CREATE.code,
    PERMISSIONS.CATEGORIES_UPDATE.code,
    PERMISSIONS.CATEGORIES_DELETE.code,
    PERMISSIONS.INVENTORY_READ.code,
    PERMISSIONS.INVENTORY_ADJUST.code,
    PERMISSIONS.CASH_READ.code,
    PERMISSIONS.CASH_OPEN.code,
    PERMISSIONS.CASH_CLOSE.code,
    PERMISSIONS.SALES_READ.code,
    PERMISSIONS.SALES_CREATE.code,
    PERMISSIONS.SALES_CANCEL.code,
    PERMISSIONS.SALES_DISCOUNT_OVERRIDE.code,
    PERMISSIONS.REPORTS_READ.code,
    PERMISSIONS.SETTINGS_READ.code,
    PERMISSIONS.SETTINGS_UPDATE.code,
    PERMISSIONS.CUSTOMERS_READ.code,
    PERMISSIONS.CUSTOMERS_CREATE.code,
    PERMISSIONS.CUSTOMERS_UPDATE.code,
    PERMISSIONS.CUSTOMERS_DELETE.code,
    PERMISSIONS.ACCOUNT_READ.code,
    PERMISSIONS.ACCOUNT_PAYMENT.code,
    PERMISSIONS.SUPPLIERS_READ.code,
    PERMISSIONS.SUPPLIERS_CREATE.code,
    PERMISSIONS.SUPPLIERS_UPDATE.code,
    PERMISSIONS.SUPPLIERS_DELETE.code,
    PERMISSIONS.PURCHASES_READ.code,
    PERMISSIONS.PURCHASES_CREATE.code,
    PERMISSIONS.PURCHASES_RECEIVE.code,
    PERMISSIONS.PURCHASES_CANCEL.code,
    PERMISSIONS.AUDIT_READ.code,
    PERMISSIONS.RETURNS_READ.code,
    PERMISSIONS.RETURNS_CREATE.code,
    PERMISSIONS.FISCAL_TYPES_READ.code,
    PERMISSIONS.FISCAL_TYPES_MANAGE.code,
    PERMISSIONS.FISCAL_SEQUENCES_READ.code,
    PERMISSIONS.FISCAL_SEQUENCES_MANAGE.code,
    PERMISSIONS.FISCAL_DOCS_READ.code,
    PERMISSIONS.FISCAL_DOCS_ISSUE.code,
    PERMISSIONS.FISCAL_PURCHASES_CREATE.code,
    PERMISSIONS.FISCAL_REPORTS_READ.code,
    PERMISSIONS.PROMOTIONS_READ.code,
    PERMISSIONS.PROMOTIONS_CREATE.code,
    PERMISSIONS.PROMOTIONS_UPDATE.code,
    PERMISSIONS.PROMOTIONS_DELETE.code,
    PERMISSIONS.CURRENCIES_READ.code,
    PERMISSIONS.CURRENCIES_MANAGE.code,
    PERMISSIONS.TAX_TYPES_READ.code,
    PERMISSIONS.TAX_TYPES_MANAGE.code,
    PERMISSIONS.PAYMENT_METHODS_READ.code,
    PERMISSIONS.PAYMENT_METHODS_MANAGE.code,
    // Sucursales: el gerente puede ver y cambiar de sucursal activa.
    PERMISSIONS.BRANCHES_READ.code,
    PERMISSIONS.BRANCHES_SWITCH.code,
  ],
  CASHIER: [
    PERMISSIONS.PRODUCTS_READ.code,
    PERMISSIONS.CATEGORIES_READ.code,
    PERMISSIONS.INVENTORY_READ.code,
    PERMISSIONS.CASH_READ.code,
    PERMISSIONS.CASH_OPEN.code,
    PERMISSIONS.CASH_CLOSE.code,
    PERMISSIONS.SALES_READ.code,
    PERMISSIONS.SALES_CREATE.code,
    // Necesario para ventas a cliente / crédito en el POS
    PERMISSIONS.CUSTOMERS_READ.code,
    PERMISSIONS.CUSTOMERS_CREATE.code,
    PERMISSIONS.ACCOUNT_READ.code,
    PERMISSIONS.ACCOUNT_PAYMENT.code,
    // Devoluciones: el cajero las inicia desde el detalle de venta
    PERMISSIONS.RETURNS_READ.code,
    PERMISSIONS.RETURNS_CREATE.code,
    // Fiscal: el cajero necesita emitir NCF al cobrar y ver los emitidos
    PERMISSIONS.FISCAL_DOCS_READ.code,
    PERMISSIONS.FISCAL_DOCS_ISSUE.code,
    PERMISSIONS.FISCAL_SEQUENCES_READ.code,
    PERMISSIONS.FISCAL_TYPES_READ.code,
    // Promociones: el cajero necesita verlas para que se apliquen al cobrar
    PERMISSIONS.PROMOTIONS_READ.code,
    // Multi-currency: el cajero necesita ver las tasas para cobrar en USD/EUR
    PERMISSIONS.CURRENCIES_READ.code,
    // Tipos de ITBIS: lectura para el form de producto / desglose de impuestos
    PERMISSIONS.TAX_TYPES_READ.code,
    // Formas de pago: el cajero necesita ver las activas para cobrar
    PERMISSIONS.PAYMENT_METHODS_READ.code,
    // Sucursales: el cajero solo ve (queda fijado a su sucursal, no cambia).
    PERMISSIONS.BRANCHES_READ.code,
  ],
};
