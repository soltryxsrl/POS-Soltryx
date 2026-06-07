'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  LogOut,
  Menu,
  Package,
  Receipt,
  ScanLine,
  Settings2,
  Shield,
  ShieldAlert,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { AuthGuard } from '@/features/auth/ui/components/AuthGuard';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { useLogout } from '@/features/auth/application/hooks/use-logout';
import { useActiveSessionMine } from '@/features/cash/application/hooks/use-cash';
import { BranchSwitcher } from '@/features/branches/ui/components/BranchSwitcher';
import { POSHeader } from '@/features/sales/ui/components/POSHeader';
import { OfflineSyncBadge } from '@/features/sales/ui/components/OfflineSyncBadge';
import { cn } from '@/shared/lib/cn';
import { VisualSettingsDialog } from '@/shared/ui/preferences/VisualSettingsDialog';

interface NavChild {
  href: string;
  label: string;
  /** Si se define, el usuario debe tener al menos uno de estos permisos. */
  permissions?: string[];
}

/** Enlace suelto de primer nivel (Inicio, POS, Reportes). */
interface NavLink {
  kind?: 'link';
  href: string;
  label: string;
  icon: LucideIcon;
  /** Si se define, el usuario debe tener al menos uno de estos permisos. */
  permissions?: string[];
}

/**
 * Grupo colapsable. El encabezado NO navega: solo abre/cierra la sección. La
 * visibilidad del grupo se deriva de sus hijos visibles (si no queda ninguno,
 * el grupo no se muestra). El estado abierto/cerrado se persiste por `id`.
 */
interface NavGroup {
  kind: 'group';
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavChild[];
}

type NavEntry = NavLink | NavGroup;

const NAV_ITEMS: NavEntry[] = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/pos', label: 'POS', icon: ScanLine, permissions: ['sales.create'] },
  {
    kind: 'group',
    id: 'ventas',
    label: 'Ventas',
    icon: Receipt,
    children: [
      { href: '/sales', label: 'Ventas', permissions: ['sales.read'] },
      { href: '/returns', label: 'Devoluciones', permissions: ['returns.read'] },
      { href: '/cash', label: 'Caja', permissions: ['cash.read'] },
    ],
  },
  {
    kind: 'group',
    id: 'catalogo',
    label: 'Catálogo',
    icon: Package,
    children: [
      { href: '/products', label: 'Productos', permissions: ['products.read'] },
      { href: '/admin/categories', label: 'Categorías', permissions: ['categories.read'] },
      { href: '/promotions', label: 'Promociones', permissions: ['promotions.read'] },
    ],
  },
  {
    kind: 'group',
    id: 'inventario',
    label: 'Inventario',
    icon: Boxes,
    children: [
      { href: '/inventory', label: 'Existencias', permissions: ['inventory.read'] },
      { href: '/transferencias', label: 'Transferencias', permissions: ['inventory.read'] },
      { href: '/conteos', label: 'Conteo físico', permissions: ['inventory.read'] },
      { href: '/purchases', label: 'Compras', permissions: ['purchases.read'] },
    ],
  },
  {
    kind: 'group',
    id: 'reportes',
    label: 'Reportes',
    icon: BarChart3,
    children: [
      { href: '/reports/daily', label: 'Resumen del día', permissions: ['reports.read'] },
      { href: '/reports/sales-detail', label: 'Detalle de ventas', permissions: ['reports.read'] },
      { href: '/reports/top-products', label: 'Top productos', permissions: ['reports.read'] },
      { href: '/reports/by-category', label: 'Ventas por categoría', permissions: ['reports.read'] },
      { href: '/reports/by-seller', label: 'Ventas por vendedor', permissions: ['reports.read'] },
      { href: '/reports/margins', label: 'Márgenes', permissions: ['reports.read'] },
      { href: '/reports/returns', label: 'Análisis devoluciones', permissions: ['reports.read'] },
      { href: '/reports/price-history', label: 'Historial de precios', permissions: ['reports.read'] },
      { href: '/reports/valuation', label: 'Valuación inventario', permissions: ['reports.read'] },
      { href: '/reports/low-stock', label: 'Stock bajo', permissions: ['reports.read'] },
      { href: '/reports/slow-movers', label: 'Lento movimiento', permissions: ['reports.read'] },
      {
        href: '/reports/stock-by-branch',
        label: 'Existencia x sucursal',
        permissions: ['branches.switch'],
      },
    ],
  },
  {
    kind: 'group',
    id: 'impuestos',
    label: 'Impuestos',
    icon: FileText,
    children: [
      {
        href: '/impuestos/facturas',
        label: 'Facturas Fiscales',
        permissions: ['fiscal.docs.read'],
      },
      {
        href: '/impuestos/compras-informales',
        label: 'Proveedores Informales',
        permissions: ['fiscal.purchases.create'],
      },
      {
        href: '/impuestos/gastos-menores',
        label: 'Gastos Menores',
        permissions: ['fiscal.purchases.create'],
      },
      {
        href: '/impuestos/informe-606',
        label: 'Informe 606',
        permissions: ['fiscal.reports.read'],
      },
      {
        href: '/impuestos/informe-607',
        label: 'Informe 607',
        permissions: ['fiscal.reports.read'],
      },
      {
        href: '/impuestos/informe-608',
        label: 'Informe 608',
        permissions: ['fiscal.reports.read'],
      },
      {
        href: '/impuestos/secuencias',
        label: 'Secuencias Fiscales',
        permissions: ['fiscal.sequences.read'],
      },
      {
        href: '/impuestos/tipos',
        label: 'Tipos de Comprobantes',
        permissions: ['fiscal.types.read'],
      },
      {
        href: '/impuestos/itbis',
        label: 'Tipos de ITBIS',
        permissions: ['tax-types.read'],
      },
    ],
  },
  {
    kind: 'group',
    id: 'admin',
    label: 'Administración',
    icon: Shield,
    children: [
      { href: '/admin/users', label: 'Usuarios', permissions: ['users.read'] },
      { href: '/admin/roles', label: 'Roles', permissions: ['roles.read'] },
      { href: '/admin/branches', label: 'Sucursales', permissions: ['branches.read'] },
      { href: '/admin/customers', label: 'Clientes', permissions: ['customers.read'] },
      { href: '/admin/suppliers', label: 'Proveedores', permissions: ['suppliers.read'] },
      { href: '/admin/business', label: 'Datos del negocio', permissions: ['settings.read'] },
      { href: '/admin/monedas', label: 'Monedas y tasas', permissions: ['currencies.read'] },
      { href: '/admin/formas-pago', label: 'Formas de pago', permissions: ['payment-methods.read'] },
      { href: '/admin/audit', label: 'Auditoría', permissions: ['audit.read'] },
      // Solo visible para super-admin (Soltryx): el permiso plan.manage no se
      // otorga por defecto; se asigna por SQL. Oculto para el admin del cliente.
      { href: '/admin/plan', label: 'Plan & Licencia', permissions: ['plan.manage'] },
    ],
  },
];

function hasAnyPermission(required: string[] | undefined, userPerms: string[]): boolean {
  if (!required || required.length === 0) return true;
  return required.some((p) => userPerms.includes(p));
}

function filterNav(items: NavEntry[], userPerms: string[]): NavEntry[] {
  const visible: NavEntry[] = [];
  for (const item of items) {
    if (item.kind === 'group') {
      // El grupo se muestra solo si al menos un hijo es visible.
      const children = item.children.filter((c) =>
        hasAnyPermission(c.permissions, userPerms),
      );
      if (children.length) visible.push({ ...item, children });
    } else if (hasAnyPermission(item.permissions, userPerms)) {
      visible.push(item);
    }
  }
  return visible;
}

const COLLAPSED_KEY = 'sidebar:collapsed';
const GROUPS_KEY = 'sidebar:groups';

function useSidebarCollapsed(): readonly [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSED_KEY) === '1') setCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return [collapsed, toggle] as const;
}

/**
 * Estado abierto/cerrado de los grupos del sidebar, persistido en localStorage
 * por `id`. El grupo de la sección activa se fuerza abierto en el render
 * (independiente de este estado) para que siempre se vea dónde estás.
 */
function useOpenGroups(): readonly [
  Record<string, boolean>,
  (id: string, open: boolean) => void,
] {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GROUPS_KEY);
      if (raw) setOpen(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      // ignore
    }
  }, []);

  const setGroup = useCallback((id: string, value: boolean) => {
    setOpen((prev) => {
      const next = { ...prev, [id]: value };
      try {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return [open, setGroup] as const;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}

/**
 * El POS corre en modo kiosco a pantalla completa (sin sidebar fijo ni la
 * tarjeta del dashboard) para maximizar el área de trabajo. El resto del
 * sistema usa el DashboardShell normal con sidebar.
 */
function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPos = pathname === '/pos' || pathname.startsWith('/pos/');
  const guarded = <RouteGuard>{children}</RouteGuard>;
  return isPos ? <PosShell>{guarded}</PosShell> : <DashboardShell>{guarded}</DashboardShell>;
}

/**
 * Permisos requeridos por ruta, derivados del propio NAV (cada item ya declara
 * sus permisos) más unas rutas índice/detalle que no están en el menú. Si la
 * ruta no está mapeada, no se restringe (el backend sigue siendo el candado real
 * vía @RequirePermissions; esto es protección de navegación/UX).
 */
const EXTRA_ROUTE_PERMS: { href: string; permissions: string[] }[] = [
  { href: '/reports', permissions: ['reports.read'] },
];

function resolveRoutePermissions(pathname: string): string[] | undefined {
  const flat: { href: string; permissions?: string[] }[] = [];
  for (const item of NAV_ITEMS) {
    if (item.kind === 'group') {
      for (const c of item.children) flat.push({ href: c.href, permissions: c.permissions });
    } else {
      flat.push({ href: item.href, permissions: item.permissions });
    }
  }
  flat.push(...EXTRA_ROUTE_PERMS);
  // La coincidencia más específica (href más largo) gana.
  const match = flat
    .filter((e) => matchesRoute(pathname, e.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.permissions;
}

/**
 * Bloquea el acceso por URL a rutas para las que el usuario no tiene permiso
 * (el menú las oculta, pero escribir la URL las abría). Defensa de navegación;
 * el backend ya rechaza los datos vía permisos.
 */
function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  // Si el usuario aún no cargó, no bloquear (AuthGuard maneja el no-login).
  if (!user) return <>{children}</>;
  const required = resolveRoutePermissions(pathname);
  if (hasAnyPermission(required, user.permissions ?? [])) return <>{children}</>;
  return <AccessDenied />;
}

function AccessDenied() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <ShieldAlert className="h-10 w-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold text-foreground">No tienes acceso a esta página</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Tu rol no incluye el permiso necesario para ver esta sección.
      </p>
      <Link href="/" className="text-sm font-medium text-brand-from hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}

/**
 * Marca del producto (Soltryx). `withName` = expandido → logo completo
 * (/soltryx-logo.png, hexágono S + "SOLTRYX"); colapsado → solo la "S"
 * (/soltryx-mark.svg, el mismo ícono del favicon).
 */
function BrandLogo({ withName = true }: { withName?: boolean }) {
  return withName ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/soltryx-logo.png" alt="Soltryx" className="h-8 w-auto object-contain" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/soltryx-mark.svg" alt="Soltryx" className="h-9 w-9 object-contain" />
  );
}

function PosShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const activeSession = useActiveSessionMine();

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-brand-tint via-background to-brand-soft">
      {/* Barra superior: menú + marca a la izquierda, info de turno a la derecha
          (la info de turno vive aquí para no gastar una franja vertical aparte). */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3 shadow-sm">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="flex-shrink-0" title="Ir al inicio">
          <BrandLogo />
        </Link>
        <BranchSwitcher className="ml-1 flex-shrink-0" />
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <OfflineSyncBadge />
          {activeSession.data && <POSHeader session={activeSession.data} />}
        </div>
      </header>

      {/* Contenido a pantalla completa */}
      <main className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">{children}</main>

      {/* Menú deslizable (off-canvas) reutilizando el Sidebar */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          />
          <div
            className="relative z-10 h-full animate-in fade-in slide-in-from-left duration-200"
            onClickCapture={(e) => {
              // Cierra el menú al pulsar cualquier enlace de navegación.
              if ((e.target as HTMLElement).closest('a[href]')) setMenuOpen(false);
            }}
          >
            <Sidebar
              collapsed={false}
              onToggle={() => {}}
              onOpenSettings={() => {
                setMenuOpen(false);
                setSettingsOpen(true);
              }}
              variant="drawer"
            />
          </div>
        </div>
      )}
      <VisualSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-tint via-background to-brand-soft">
      {/* Indicador global de sincronización offline (también monta el motor de
          drenado de la cola mientras se navega fuera del POS). */}
      <div className="pointer-events-none fixed right-6 top-6 z-40">
        <OfflineSyncBadge />
      </div>
      <div className="flex gap-5 p-5">
        <Sidebar
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <main className="min-h-[calc(100vh-2.5rem)] flex-1 rounded-3xl border border-border bg-card px-8 py-8 shadow-xl shadow-brand-soft/40">
          {children}
        </main>
      </div>
      <VisualSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

function matchesRoute(pathname: string, href: string): boolean {
  if (href === '/') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar({
  collapsed,
  onToggle,
  onOpenSettings,
  variant = 'docked',
}: {
  collapsed: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
  variant?: 'docked' | 'drawer';
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [openGroups, setOpenGroup] = useOpenGroups();
  const visibleNav = useMemo(
    () => filterNav(NAV_ITEMS, user?.permissions ?? []),
    [user?.permissions],
  );
  const isDrawer = variant === 'drawer';

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col bg-card shadow-xl shadow-brand-soft/40',
        isDrawer
          ? 'h-full w-64 border-r border-border'
          : cn(
              'sticky top-5 h-[calc(100vh-2.5rem)] rounded-3xl border border-border transition-[width] duration-200',
              collapsed ? 'w-[76px]' : 'w-60',
            ),
      )}
    >
      {!isDrawer && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir' : 'Colapsar'}
          className="absolute -right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition hover:scale-110 hover:text-foreground hover:shadow-lg"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      )}

      <div className={cn('pb-4 pt-6', collapsed ? 'px-3' : 'px-5')}>
        {/* Logo centrado en el nav: completo expandido, la "S" colapsado. */}
        <Link href="/" className="flex items-center justify-center" title="Soltryx">
          <BrandLogo withName={!collapsed} />
        </Link>
        {!collapsed && <BranchSwitcher className="mt-3" />}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-2">
        <ul className="flex flex-col gap-0.5">
          {visibleNav.map((entry) =>
            entry.kind === 'group' ? (
              <NavGroupRow
                key={entry.id}
                group={entry}
                pathname={pathname}
                collapsed={collapsed}
                open={!!openGroups[entry.id]}
                onToggleOpen={(v) => setOpenGroup(entry.id, v)}
                onExpandSidebar={onToggle}
              />
            ) : (
              <NavLinkRow
                key={entry.href}
                item={entry}
                pathname={pathname}
                collapsed={collapsed}
              />
            ),
          )}
        </ul>
      </nav>

      <div
        className={cn(
          'border-t border-border py-3',
          collapsed ? 'px-2' : 'px-3',
        )}
      >
        <ProfileMenu collapsed={collapsed} onOpenSettings={onOpenSettings} />
      </div>
    </aside>
  );
}

function ProfileMenu({
  collapsed,
  onOpenSettings,
}: {
  collapsed: boolean;
  onOpenSettings: () => void;
}) {
  const { user } = useAuth();
  const logout = useLogout();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handle = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={containerRef} className="relative">
      {collapsed ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={user?.fullName ?? 'Usuario'}
          className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-from to-brand-to text-xs font-semibold text-white shadow-md shadow-brand-from/20 ring-offset-2 transition hover:ring-2 hover:ring-brand-soft"
        >
          {getInitials(user?.fullName)}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-muted/60',
            open && 'bg-muted/60',
          )}
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-from to-brand-to text-xs font-semibold text-white shadow-md shadow-brand-from/20">
            {getInitials(user?.fullName)}
          </span>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-xs font-medium text-foreground">
              {user?.fullName}
            </div>
            <div className="truncate text-[10px] text-muted-foreground">
              {user?.roles.join(', ')}
            </div>
          </div>
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform',
              open && 'rotate-90',
            )}
          />
        </button>
      )}

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-30 w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-xl',
            collapsed
              ? 'bottom-0 left-full ml-3'
              : 'bottom-full left-0 right-0 mb-2',
          )}
        >
          <div className="border-b border-border px-3 py-2">
            <div className="truncate text-sm font-medium text-foreground">
              {user?.fullName}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {user?.email}
            </div>
          </div>

          <MenuItem
            icon={<UserRound className="h-4 w-4" />}
            label="Mi Perfil"
            onClick={handle(() => router.push('/profile'))}
          />
          <MenuItem
            icon={<Settings2 className="h-4 w-4" />}
            label="Configuración visual"
            onClick={handle(onOpenSettings)}
          />

          <div className="my-1 border-t border-border" />

          <MenuItem
            icon={<LogOut className="h-4 w-4" />}
            label={logout.isPending ? 'Saliendo...' : 'Salir'}
            onClick={handle(() => logout.mutate())}
            disabled={logout.isPending}
            destructive
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
  destructive,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition disabled:opacity-50',
        destructive
          ? 'text-rose-600 hover:bg-rose-50'
          : 'text-foreground hover:bg-muted/60',
      )}
    >
      <span className={destructive ? 'text-rose-500' : 'text-muted-foreground'}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

function NavLinkRow({
  item,
  pathname,
  collapsed,
}: {
  item: NavLink;
  pathname: string;
  collapsed: boolean;
}) {
  const isActive = matchesRoute(pathname, item.href);
  const Icon = item.icon;

  if (collapsed) {
    return (
      <li>
        <Link
          href={item.href}
          aria-current={isActive ? 'page' : undefined}
          aria-label={item.label}
          className={cn(
            'group relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition',
            isActive
              ? 'bg-gradient-to-br from-brand-tint to-brand-soft text-brand-from shadow-sm shadow-brand-tint'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Icon
            className={cn(
              'h-4 w-4 transition-colors',
              isActive ? 'text-brand-from' : 'text-muted-foreground group-hover:text-foreground',
            )}
          />
          <Tooltip>{item.label}</Tooltip>
        </Link>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-all',
          isActive
            ? 'bg-gradient-to-r from-brand-tint to-brand-soft font-medium text-brand-from shadow-sm shadow-brand-tint'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4 transition-colors',
            isActive ? 'text-brand-from' : 'text-muted-foreground',
          )}
        />
        <span className="flex-1">{item.label}</span>
      </Link>
    </li>
  );
}

function NavGroupRow({
  group,
  pathname,
  collapsed,
  open,
  onToggleOpen,
  onExpandSidebar,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  open: boolean;
  onToggleOpen: (open: boolean) => void;
  onExpandSidebar: () => void;
}) {
  const Icon = group.icon;
  const containsActive = group.children.some((c) => matchesRoute(pathname, c.href));
  // La sección activa siempre se ve abierta; el resto respeta el toggle guardado.
  const isOpen = containsActive || open;

  // Modo colapsado (solo íconos): al pulsar, expandimos el sidebar y abrimos el
  // grupo, evitando un flyout que la barra recorta por su overflow.
  if (collapsed) {
    return (
      <li>
        <button
          type="button"
          aria-label={group.label}
          onClick={() => {
            onExpandSidebar();
            onToggleOpen(true);
          }}
          className={cn(
            'group relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition',
            containsActive
              ? 'bg-gradient-to-br from-brand-tint to-brand-soft text-brand-from shadow-sm shadow-brand-tint'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Icon
            className={cn(
              'h-4 w-4 transition-colors',
              containsActive ? 'text-brand-from' : 'text-muted-foreground group-hover:text-foreground',
            )}
          />
          <Tooltip>{group.label}</Tooltip>
        </button>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onToggleOpen(!isOpen)}
        aria-expanded={isOpen}
        className={cn(
          'flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm transition-all',
          containsActive
            ? 'font-medium text-brand-from'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4 transition-colors',
            containsActive ? 'text-brand-from' : 'text-muted-foreground',
          )}
        />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            isOpen ? 'rotate-90 text-brand-from' : 'text-muted-foreground',
          )}
        />
      </button>

      {isOpen && (
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {group.children.map((child) => {
            const childActive = matchesRoute(pathname, child.href);
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  aria-current={childActive ? 'page' : undefined}
                  className={cn(
                    'flex h-9 items-center gap-3 rounded-xl pl-10 pr-3 text-[13px] transition-colors',
                    childActive
                      ? 'font-medium text-brand-from'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'h-1.5 w-1.5 rounded-full transition-colors',
                      childActive
                        ? 'bg-brand-from shadow-[0_0_6px_hsl(var(--brand-from)/0.6)]'
                        : 'bg-muted-foreground/40',
                    )}
                  />
                  <span className="flex-1">{child.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function Tooltip({ children }: { children: ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100"
    >
      {children}
    </span>
  );
}
