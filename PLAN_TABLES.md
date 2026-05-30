# Plan: Paginación, filtros y ordenamiento en tablas

**Estado actual:** 13 tablas en el cliente, ninguna pagina server-side, casi ninguna ordena. El backend ya soporta paginación con envelope `{ items, total }` en 8/10 endpoints — la deuda es del cliente.

---

## 1. Componente `DataTable` compartido

**Ubicación:** `client/src/shared/ui/data-table/`

### API (props)

```ts
type Column<T> = {
  key: string;             // identificador (también el sortKey si es ordenable)
  header: string;
  sortable?: boolean;
  width?: string;          // ej. '120px' o '20%'
  align?: 'left' | 'right' | 'center';
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  total: number;

  page: number;             // 1-based
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];   // default [10, 25, 50, 100]

  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (key: string, dir: 'asc' | 'desc') => void;

  isLoading?: boolean;
  isFetching?: boolean;     // overlay sin parpadeo al cambiar página
  emptyState?: React.ReactNode;
  toolbar?: React.ReactNode;  // slot para filtros/búsqueda arriba
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
};
```

### Comportamiento

- **Page size por defecto:** 25 (no 100 como hoy).
- **Footer:** muestra `Mostrando X-Y de Z` + selector page size + `Anterior` / `Siguiente` + saltar a primera/última.
- **Sort:** click en header con `sortable` → toggle asc/desc/sin sort (3 estados).
- **Loading:** primer load = skeleton; refetch al cambiar página/filtro = overlay translúcido sobre filas existentes (no parpadea).
- **Empty:** mensaje custom + icono; si hay filtros activos sugiere "limpiar filtros".
- **Sticky header** y body con scroll vertical cuando supere altura del viewport.

### Hook auxiliar `useTableQueryState`

Sincroniza estado de tabla con URL via `useSearchParams` de Next.js App Router. Mantiene `page`, `pageSize`, `sort`, `sortDir` y filtros en query string, así un refresh o link compartido preserva el estado.

```ts
const { state, setState, debouncedQ } = useTableQueryState({
  defaults: { page: 1, pageSize: 25, sort: 'createdAt', sortDir: 'desc' },
  filterKeys: ['q', 'status', 'from', 'to'],  // se proyectan al URL
});
```

`q` se debounce a 300ms para no disparar request por tecla.

---

## 2. Contrato backend (mostly done)

### Lo que ya está

8/10 endpoints aceptan `limit`, `offset` y devuelven `{ items, total }`:
Sales, Products, Customers, Suppliers, Purchase Orders, Users, Cash Sessions, Inventory Movements.

### Lo que falta

**Sort universal.** Ningún endpoint acepta `sort` / `sortDir`. Agregar a cada `*QueryDto`:

```ts
@IsOptional() @IsString()
sort?: string;            // whitelist por entidad

@IsOptional() @IsIn(['asc', 'desc'])
sortDir?: 'asc' | 'desc';
```

Cada service mantiene su whitelist (ej. Sales: `createdAt`, `total`, `receiptNumber`; Products: `name`, `sku`, `stock`, `price`, `createdAt`). Si llega columna fuera de la whitelist se cae a default.

**Endpoints sin paginación:**
- `Promotions` (`GET /api/promotions`): agregar `q`, `isActive`, `from`, `to`, `limit`, `offset`, `sort` y migrar a envelope `{ items, total }`.
- `Returns`: hoy solo hay `GET /api/sales/:saleId/returnable-items` y `POST /api/returns`. Crear `GET /api/returns` global con `q`, `from`, `to`, `userId`, `limit`, `offset`, `sort` y envelope.

**Filtros nuevos por entidad** (los que faltan y son los más usados):

| Entidad | Filtros nuevos | Sort por defecto |
|---|---|---|
| Sales | `q` (# recibo/factura), `paymentMethod` | `createdAt desc` |
| Products | `type` (simple/kit/variant) | `name asc` |
| Customers | — | `name asc` |
| Suppliers | — | `name asc` |
| Purchase Orders | `q` (# PO) | `createdAt desc` |
| Users | `roleId` | `username asc` |
| Cash Sessions | — | `openedAt desc` |
| Inv. Movements | `type` (SALE/PURCHASE/ADJUSTMENT/RETURN), `from`, `to` | `createdAt desc` |
| Promotions | `q`, `status` (active/scheduled/expired/inactive), `from`, `to` | `createdAt desc` |
| Returns | `q` (# de devolución), `from`, `to`, `userId` | `createdAt desc` |

---

## 3. Filtros recomendados por tabla (los más usados)

Los toolbars se diseñan compactos: una fila con search (input principal) + chips de filtros rápidos + botón "Más filtros" para los avanzados en un popover.

### Ventas (top prioridad)
- Search: # recibo
- Quick chips: **Hoy**, **Ayer**, **Semana**, **Mes**
- Filtros avanzados: rango fecha (from/to), estado (activa/cancelada), cajero, método pago, sesión de caja

### Productos
- Search: nombre / SKU / código de barras
- Quick chips: **Stock bajo**, **Activos**, **Inactivos**
- Filtros avanzados: categoría, tipo (simple/kit/variant)

### Clientes
- Search: nombre / documento / teléfono / email
- Filtro: activos/inactivos

### Proveedores
- Search: nombre / RNC / contacto / teléfono
- Filtro: activos/inactivos

### Órdenes de Compra
- Search: # PO
- Quick chips: estado (Pendiente / Parcial / Recibida / Cancelada)
- Filtros avanzados: rango fecha, proveedor

### Sesiones de Caja
- Quick chips: estado (Abierta / Cerrada), **Hoy**, **Semana**
- Filtros avanzados: rango fecha, caja, usuario que abrió

### Movimientos de Inventario
- Filtro: producto
- Quick chips: tipo (Venta / Compra / Ajuste / Devolución)
- Filtros avanzados: rango fecha

### Usuarios
- Search: email / username / nombre
- Filtros: estado (activos/inactivos/todos), rol

### Promociones
- Search: nombre
- Quick chips: estado (Activa / Programada / Expirada / Inactiva)
- Filtros avanzados: rango fecha

### Devoluciones
- Search: # devolución
- Filtros: rango fecha, usuario

### Tablas chicas (sin urgencia)
Roles, Monedas, Secuencias Fiscales, Tipos Doc. Fiscales: solo agregar el `DataTable` con sort si se quiere uniformidad. Sin paginación (datasets <50 filas).

---

## 4. Orden de migración

| Fase | Tabla | Backend | Cliente | Notas |
|---|---|---|---|---|
| 0 | — | Add `sort/sortDir` global a query DTOs | — | Base para todas |
| 0 | — | — | Build `DataTable` + `useTableQueryState` | Base UI |
| 1 | **Ventas** | + `q`, `paymentMethod`, sort whitelist | Migrar `SalesTable` | Mayor impacto |
| 2 | **Productos** | + `type`, sort whitelist | Migrar `ProductsTable` | Alto tráfico |
| 3 | **Clientes** | sort whitelist | Migrar `CustomersTable` | |
| 4 | **Órdenes Compra** | + `q`, sort whitelist | Migrar `PurchaseOrdersTable` | |
| 5 | **Mov. Inventario** | + `type`, `from`, `to`, sort whitelist | Migrar `StockMovementsTable` | |
| 6 | **Sesiones Caja** | sort whitelist | Migrar `SessionsTable` | |
| 7 | **Proveedores** | sort whitelist | Migrar `SuppliersTable` | Bajo tráfico |
| 8 | **Usuarios** | + `roleId`, sort whitelist | Migrar `UsersTable` | |
| 9 | **Promociones** | Refactor a paginado | Migrar `PromotionsTable` | Mayor cambio backend |
| 10 | **Devoluciones** | Crear `GET /api/returns` global | Migrar/crear `ReturnsTable` | Endpoint nuevo |
| 11 | Roles / Monedas / Sec. Fiscales / Doc Types | Solo sort | Migrar a `DataTable` (sin pag) | Cosmético |

---

## 5. Riesgos / decisiones a confirmar

1. **URL state vs estado local** — propongo URL state (refresh-safe, shareable). Costo: 1 navegación = 1 fetch. Si prefieres estado en memoria, lo cambio.
2. **Page size default 25** — hoy traen 100 sin paginar. 25 reduce payload pero requiere clicks. Acepta override por tabla.
3. **Promotions y Returns rompen su API actual.** El frontend que los consume hoy hay que migrarlo en el mismo PR para no dejar la app rota.
4. **Devoluciones globales** — hoy solo se ven por venta. ¿Quieres una vista global `/returns` o sigue siendo por venta?
5. **Tablas chicas (Roles/Monedas/Sec. Fiscales/DocTypes)** — ¿uniformar al `DataTable` por consistencia o dejarlas como están?

Cuando confirmes, arranco con **Fase 0 (DataTable + sort backend)** y luego Ventas.
