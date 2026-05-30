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
  Home,
  LogOut,
  Package,
  Receipt,
  ScanLine,
  Settings2,
  Shield,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { AuthGuard } from '@/features/auth/ui/components/AuthGuard';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { useLogout } from '@/features/auth/application/hooks/use-logout';
import { cn } from '@/shared/lib/cn';
import { VisualSettingsDialog } from '@/shared/ui/preferences/VisualSettingsDialog';

interface NavChild {
  href: string;
  label: string;
  /** Si se define, el usuario debe tener al menos uno de estos permisos. */
  permissions?: string[];
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Si se define, el usuario debe tener al menos uno de estos permisos. */
  permissions?: string[];
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  {
    href: '/dashboard/products',
    label: 'Productos',
    icon: Package,
    permissions: ['products.read'],
  },
  {
    href: '/dashboard/inventory',
    label: 'Inventario',
    icon: Boxes,
    permissions: ['inventory.read'],
  },
  { href: '/dashboard/cash', label: 'Caja', icon: Wallet, permissions: ['cash.read'] },
  { href: '/dashboard/pos', label: 'POS', icon: ScanLine, permissions: ['sales.create'] },
  { href: '/dashboard/sales', label: 'Ventas', icon: Receipt, permissions: ['sales.read'] },
  {
    href: '/dashboard/reports',
    label: 'Reportes',
    icon: BarChart3,
    permissions: ['reports.read'],
  },
  {
    href: '/dashboard/admin/users',
    label: 'Administración',
    icon: Shield,
    permissions: ['users.read', 'roles.read'],
    children: [
      { href: '/dashboard/admin/users', label: 'Usuarios', permissions: ['users.read'] },
      { href: '/dashboard/admin/roles', label: 'Roles', permissions: ['roles.read'] },
    ],
  },
];

function hasAnyPermission(required: string[] | undefined, userPerms: string[]): boolean {
  if (!required || required.length === 0) return true;
  return required.some((p) => userPerms.includes(p));
}

function filterNav(items: NavItem[], userPerms: string[]): NavItem[] {
  const visible: NavItem[] = [];
  for (const item of items) {
    if (!hasAnyPermission(item.permissions, userPerms)) continue;
    if (item.children?.length) {
      const filteredChildren = item.children.filter((c) =>
        hasAnyPermission(c.permissions, userPerms),
      );
      visible.push({ ...item, children: filteredChildren });
    } else {
      visible.push(item);
    }
  }
  return visible;
}

const COLLAPSED_KEY = 'sidebar:collapsed';

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

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}

function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-tint via-background to-brand-soft">
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
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar({
  collapsed,
  onToggle,
  onOpenSettings,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const visibleNav = useMemo(
    () => filterNav(NAV_ITEMS, user?.permissions ?? []),
    [user?.permissions],
  );

  return (
    <aside
      className={cn(
        'sticky top-5 flex h-[calc(100vh-2.5rem)] shrink-0 flex-col rounded-3xl border border-border bg-card shadow-xl shadow-brand-soft/40 transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-60',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Expandir' : 'Colapsar'}
        className="absolute -right-3 top-8 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition hover:scale-110 hover:text-foreground hover:shadow-lg"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <div
        className={cn(
          'pb-4 pt-6',
          collapsed ? 'flex justify-center px-3' : 'px-5',
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 min-w-0"
          title="T1ET POS"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-from to-brand-to text-sm font-bold text-white shadow-lg shadow-brand-from/30">
            T1
          </span>
          {!collapsed && (
            <span className="truncate text-sm font-semibold tracking-tight text-foreground">
              T1ET POS
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-2">
        <ul className="flex flex-col gap-0.5">
          {visibleNav.map((item) => (
            <NavRow
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={collapsed}
            />
          ))}
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
            onClick={handle(() => router.push('/dashboard/profile'))}
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

function NavRow({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const hasChildren = !!item.children?.length;
  const childActive =
    hasChildren && item.children!.some((c) => matchesRoute(pathname, c.href));
  const isActive = matchesRoute(pathname, item.href) || childActive;
  const Icon = item.icon;
  const childrenVisible = hasChildren && isActive && !collapsed;

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
        {hasChildren && (
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              childrenVisible ? 'rotate-90 text-brand-from' : 'text-muted-foreground',
            )}
          />
        )}
      </Link>

      {childrenVisible && (
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {item.children!.map((child) => {
            const childActive = pathname === child.href;
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
