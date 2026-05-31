'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BarChart3,
  Boxes,
  Clock,
  CreditCard,
  Crown,
  Package,
  Receipt,
  ScanLine,
  Smartphone,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { useActiveSessionMine } from '@/features/cash/application/hooks/use-cash';
import {
  useDailySales,
  useLowStock,
  useSessionsByUser,
  useTopProducts,
} from '@/features/reports/application/hooks/use-reports';
import { localDateISO, startOfMonthLocalISO } from '@/shared/lib/date';
import { formatMoney, formatQuantity } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { BarRow } from '@/shared/ui/charts/BarRow';
import { DonutChart, type DonutSlice } from '@/shared/ui/charts/DonutChart';

const METHOD_PALETTE: Record<string, { color: string; icon: LucideIcon; label: string }> = {
  CASH: { color: '#10b981', icon: Banknote, label: 'Efectivo' },
  CARD: { color: '#6366f1', icon: CreditCard, label: 'Tarjeta' },
  TRANSFER: { color: '#8b5cf6', icon: Smartphone, label: 'Transferencia' },
  MIXED: { color: '#f59e0b', icon: Wallet, label: 'Mixto' },
  OTHER: { color: '#94a3b8', icon: Wallet, label: 'Otro' },
};

const FALLBACK_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

// Importadas desde shared/lib/date — usan fecha LOCAL (no UTC) para evitar
// que ventas hechas tarde en la noche caigan en el día equivocado.

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * Reloj en vivo (tick cada segundo). Componente aislado para que solo él
 * re-renderice y no todo el dashboard. Inicia en null y se setea en el cliente
 * para evitar mismatch de hidratación (SSR no conoce la hora exacta).
 */
function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <Clock className="h-3.5 w-3.5" />
      {now
        ? now.toLocaleTimeString('es-DO', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })
        : '—'}
    </span>
  );
}

function todayLong(): string {
  return new Date().toLocaleDateString('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const today = localDateISO();
  const monthStart = startOfMonthLocalISO();

  const daily = useDailySales(today);
  const topMonth = useTopProducts({ from: monthStart, to: today, limit: 5 });
  const lowStock = useLowStock();
  const activeSession = useActiveSessionMine();
  const sessionsByUser = useSessionsByUser({ from: today, to: today });

  const totalToday = Number(daily.data?.total ?? 0);
  const salesCount = daily.data?.salesCount ?? 0;
  const avgTicket = salesCount > 0 ? totalToday / salesCount : 0;
  const cancelled = daily.data?.cancelledCount ?? 0;
  const lowStockCount = lowStock.data?.length ?? 0;

  const session = activeSession.data;
  const sessionOpen = !!session;

  return (
    <div className="space-y-6">
      <Hero
        name={user?.fullName ?? ''}
        sessionOpen={sessionOpen}
        sessionOpenedAt={session?.openedAt ?? null}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          icon={TrendingUp}
          label="Ventas hoy"
          value={formatMoney(totalToday)}
          hint={`${salesCount} ${salesCount === 1 ? 'ticket' : 'tickets'}`}
          tone="brand"
          loading={daily.isLoading}
        />
        <KpiTile
          icon={Receipt}
          label="Ticket promedio"
          value={formatMoney(avgTicket)}
          hint={cancelled > 0 ? `${cancelled} canceladas` : 'sin canceladas'}
          tone="brand-alt"
          loading={daily.isLoading}
        />
        <KpiTile
          icon={AlertTriangle}
          label="Stock bajo"
          value={String(lowStockCount)}
          hint={lowStockCount === 0 ? 'todo en rango' : 'requiere atención'}
          tone={lowStockCount > 0 ? 'amber' : 'emerald'}
          loading={lowStock.isLoading}
        />
        <KpiTile
          icon={Wallet}
          label="Caja"
          value={sessionOpen ? 'Abierta' : 'Cerrada'}
          hint={
            sessionOpen && session
              ? `desde ${new Date(session.openedAt).toLocaleTimeString('es-DO', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'sin sesión activa'
          }
          tone={sessionOpen ? 'emerald' : 'slate'}
          loading={activeSession.isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Métodos de pago" badge="hoy" />
          <PaymentMethodsChart
            data={daily.data?.byMethod ?? []}
            total={totalToday}
            loading={daily.isLoading}
          />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Top productos del mes"
            action={
              <Link
                href="/reports"
                className="flex items-center gap-1 text-xs font-medium text-brand-from hover:opacity-80"
              >
                Ver reportes <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <TopProductsList
            data={topMonth.data ?? []}
            loading={topMonth.isLoading}
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Cajeros de hoy" />
          <CashiersList
            data={sessionsByUser.data ?? []}
            loading={sessionsByUser.isLoading}
          />
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader
            title="Alertas de stock"
            action={
              <Link
                href="/inventory"
                className="flex items-center gap-1 text-xs font-medium text-brand-from hover:opacity-80"
              >
                Inventario <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <LowStockList data={lowStock.data ?? []} loading={lowStock.isLoading} />
        </Card>
      </div>

      <QuickActions />
    </div>
  );
}

function Hero({
  name,
  sessionOpen,
  sessionOpenedAt,
}: {
  name: string;
  sessionOpen: boolean;
  sessionOpenedAt: string | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-brand-from via-brand-to to-brand-from px-7 py-6 text-white shadow-xl shadow-brand-from/30">
      <div
        aria-hidden
        className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl"
      />

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-white/80">
            {greeting()}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {name || 'Bienvenido'}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-white/85">
            <span className="capitalize">{todayLong()}</span>
            <span className="text-white/40" aria-hidden>
              ·
            </span>
            <LiveClock />
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium backdrop-blur',
              sessionOpen
                ? 'bg-emerald-400/20 text-emerald-50 ring-1 ring-emerald-200/40'
                : 'bg-rose-400/20 text-rose-50 ring-1 ring-rose-200/40',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                sessionOpen ? 'bg-emerald-300' : 'bg-rose-300',
              )}
            />
            {sessionOpen ? 'Caja abierta' : 'Caja cerrada'}
            {sessionOpen && sessionOpenedAt && (
              <span className="text-white/75">
                ·{' '}
                {new Date(sessionOpenedAt).toLocaleTimeString('es-DO', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
          <Link
            href={sessionOpen ? '/pos' : '/cash'}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-brand-from shadow-md transition hover:bg-white/90"
          >
            <ScanLine className="h-3.5 w-3.5" />
            {sessionOpen ? 'Ir al POS' : 'Abrir caja'}
          </Link>
        </div>
      </div>
    </div>
  );
}

type Tone = 'brand' | 'brand-alt' | 'amber' | 'emerald' | 'slate';

const TONE: Record<Tone, { bg: string; ring: string; icon: string; chip: string }> = {
  brand: {
    bg: 'bg-gradient-to-br from-brand-from to-brand-from',
    ring: 'ring-brand-soft/60',
    icon: 'text-white',
    chip: 'bg-brand-tint text-brand-from',
  },
  'brand-alt': {
    bg: 'bg-gradient-to-br from-brand-from to-brand-to',
    ring: 'ring-brand-soft/60',
    icon: 'text-white',
    chip: 'bg-brand-tint text-brand-from',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    ring: 'ring-amber-200/60',
    icon: 'text-white',
    chip: 'bg-amber-50 text-amber-800',
  },
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
    ring: 'ring-emerald-200/60',
    icon: 'text-white',
    chip: 'bg-emerald-50 text-emerald-700',
  },
  slate: {
    bg: 'bg-gradient-to-br from-slate-400 to-slate-500',
    ring: 'ring-slate-200/60',
    icon: 'text-white',
    chip: 'bg-slate-100 text-slate-600',
  },
};

function KpiTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone: Tone;
  loading?: boolean;
}) {
  const t = TONE[tone];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm shadow-brand-tint/40 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-soft/40">
      <div
        aria-hidden
        className={cn(
          'absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition group-hover:opacity-20',
          t.bg,
        )}
      />
      <div className="flex items-center justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl shadow-md ring-4',
            t.bg,
            t.ring,
          )}
        >
          <Icon className={cn('h-4 w-4', t.icon)} />
        </div>
        {hint && (
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', t.chip)}>
            {hint}
          </span>
        )}
      </div>
      <div className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
        {loading ? <Skeleton className="h-7 w-24" /> : value}
      </div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-5 shadow-sm shadow-brand-tint/30',
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({
  title,
  badge,
  action,
}: {
  title: string;
  badge?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {badge && (
          <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-from">
            {badge}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

function PaymentMethodsChart({
  data,
  total,
  loading,
}: {
  data: Array<{ method: string; count: number; total: string | number }>;
  total: number;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="h-40 w-40 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <EmptyState
        icon={CreditCard}
        message="Aún no hay ventas registradas hoy."
      />
    );
  }

  const slices: DonutSlice[] = data.map((m, i) => ({
    label: METHOD_PALETTE[m.method]?.label ?? m.method,
    value: Number(m.total),
    color:
      METHOD_PALETTE[m.method]?.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));
  // Los % y barras se calculan sobre la SUMA de los métodos (no el total de
  // ventas) para que siempre sumen 100% y la barra nunca se desborde, aunque la
  // data difiera del total por redondeos.
  const methodsTotal = data.reduce((s, m) => s + Number(m.total), 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <DonutChart
        data={slices}
        size={160}
        thickness={20}
        centerLabel="Total"
        centerValue={formatMoney(total)}
      />
      <ul className="flex-1 space-y-2 self-stretch">
        {data.map((m, i) => {
          const meta = METHOD_PALETTE[m.method];
          const color = meta?.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
          const pct = methodsTotal > 0 ? (Number(m.total) / methodsTotal) * 100 : 0;
          return (
            <li key={m.method} className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="font-medium text-foreground">
                  {meta?.label ?? m.method}
                </span>
                <span className="ml-auto font-semibold text-foreground">
                  {formatMoney(m.total)}
                </span>
              </div>
              <BarRow
                value={Number(m.total)}
                max={methodsTotal}
                className="h-1"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>
                  {m.count} {m.count === 1 ? 'venta' : 'ventas'}
                </span>
                <span>{pct.toFixed(1)}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TopProductsList({
  data,
  loading,
}: {
  data: Array<{
    productId: string;
    name: string;
    sku: string;
    unitsSold: string;
    revenue: string | number;
  }>;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <EmptyState
        icon={Package}
        message="Todavía no hay ventas este mes."
      />
    );
  }

  const max = Math.max(...data.map((p) => Number(p.revenue))) || 1;

  return (
    <ul className="space-y-3">
      {data.map((p, i) => {
        const revenue = Number(p.revenue);
        return (
          <li key={p.productId} className="space-y-1.5">
            <div className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-semibold',
                  i === 0
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-200'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {i === 0 ? <Crown className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-foreground">{p.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {p.sku} · {formatQuantity(p.unitsSold)} uds
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-foreground">
                  {formatMoney(revenue)}
                </div>
              </div>
            </div>
            <BarRow value={revenue} max={max} />
          </li>
        );
      })}
    </ul>
  );
}

function CashiersList({
  data,
  loading,
}: {
  data: Array<{
    userId: string;
    username: string;
    fullName: string;
    sessionsCount: number;
    salesCount: number;
    totalSold: string | number;
  }>;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <EmptyState icon={Wallet} message="No hay actividad de caja hoy." />
    );
  }

  const max = Math.max(...data.map((u) => Number(u.totalSold))) || 1;

  return (
    <ul className="space-y-3">
      {data.map((u) => {
        const total = Number(u.totalSold);
        return (
          <li key={u.userId} className="rounded-xl border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-from to-brand-to text-xs font-semibold text-white shadow-md shadow-brand-from/20">
                {getInitials(u.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">
                  {u.fullName}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {u.salesCount} ventas · {u.sessionsCount} sesión
                  {u.sessionsCount === 1 ? '' : 'es'}
                </div>
              </div>
              <div className="text-sm font-semibold text-foreground">
                {formatMoney(total)}
              </div>
            </div>
            <div className="mt-2">
              <BarRow value={total} max={max} className="h-1" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function LowStockList({
  data,
  loading,
}: {
  data: Array<{
    id: string;
    name: string;
    sku: string;
    stock: string;
    minStock: string;
    categoryName: string | null;
  }>;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <EmptyState
        icon={Boxes}
        message="Sin alertas — todo el stock está en rango."
      />
    );
  }

  const top = data.slice(0, 5);

  return (
    <ul className="space-y-2">
      {top.map((p) => (
        <li
          key={p.id}
          className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2"
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {p.categoryName ?? 'Sin categoría'} · mín. {formatQuantity(p.minStock)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-amber-700">
              {formatQuantity(p.stock)}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-amber-600">
              en stock
            </div>
          </div>
        </li>
      ))}
      {data.length > top.length && (
        <li className="text-center text-[11px] text-muted-foreground">
          +{data.length - top.length} más
        </li>
      )}
    </ul>
  );
}

function QuickActions() {
  const actions: Array<{ href: string; label: string; icon: LucideIcon; tone: Tone }> = [
    { href: '/pos', label: 'Nueva venta', icon: ScanLine, tone: 'brand' },
    { href: '/products', label: 'Productos', icon: Package, tone: 'brand-alt' },
    { href: '/inventory', label: 'Inventario', icon: Boxes, tone: 'emerald' },
    { href: '/cash', label: 'Caja', icon: Wallet, tone: 'amber' },
    { href: '/sales', label: 'Ventas', icon: Receipt, tone: 'slate' },
    { href: '/reports', label: 'Reportes', icon: BarChart3, tone: 'brand' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {actions.map((a) => {
        const t = TONE[a.tone];
        const Icon = a.icon;
        return (
          <Link
            key={a.href}
            href={a.href}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-tint/30 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-soft/40"
          >
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl shadow-md transition group-hover:scale-105',
                t.bg,
              )}
            >
              <Icon className="h-4 w-4 text-white" />
            </span>
            <span className="text-xs font-medium text-foreground">{a.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: LucideIcon;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gradient-to-r from-muted via-muted/60 to-muted',
        className,
      )}
    />
  );
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}
