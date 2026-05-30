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

  // --- Reportes ---
  REPORTS_READ: { code: 'reports.read', name: 'Ver reportes', module: 'reports' },
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
    PERMISSIONS.REPORTS_READ.code,
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
  ],
};
