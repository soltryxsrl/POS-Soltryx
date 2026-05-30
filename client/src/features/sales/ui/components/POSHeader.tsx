'use client';

import { useEffect, useState } from 'react';
import { Clock, ReceiptText, UserRound, Warehouse } from 'lucide-react';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { useCashRegisters, useSessionSummary } from '@/features/cash/application/hooks/use-cash';
import type { CashSession } from '@/features/cash/domain/types';
import { formatMoney } from '@/shared/lib/format';

interface Props {
  session: CashSession;
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatElapsed(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function POSHeader({ session }: Props) {
  const { user } = useAuth();
  const registers = useCashRegisters();
  const summary = useSessionSummary(session.id);
  // Re-render cada minuto para que el "hace X min" avance solo.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const register = registers.data?.find((r) => r.id === session.cashRegisterId);
  const totalSales =
    Number(summary.data?.cashSales ?? 0) + Number(summary.data?.nonCashSales ?? 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-tint via-card to-brand-soft shadow-sm shadow-brand-soft/40">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-brand-from/20 to-brand-to/10 blur-3xl"
      />
      <div className="relative grid gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<UserRound className="h-4 w-4" />}
          label="Cajero"
          value={user?.fullName ?? '—'}
          sub={user?.roles?.[0] ?? ''}
        />
        <Stat
          icon={<Warehouse className="h-4 w-4" />}
          label="Caja"
          value={register?.name ?? register?.code ?? 'CR-001'}
          sub={register?.code ?? ''}
        />
        <Stat
          icon={<Clock className="h-4 w-4" />}
          label="Turno abierto"
          value={formatClock(session.openedAt)}
          sub={`Hace ${formatElapsed(session.openedAt)}`}
        />
        <Stat
          icon={<ReceiptText className="h-4 w-4" />}
          label="Ventas del turno"
          value={formatMoney(totalSales.toFixed(2))}
          sub={
            summary.data
              ? `Efectivo ${formatMoney(summary.data.cashSales)}`
              : 'cargando…'
          }
          accent
        />
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={
          accent
            ? 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-from to-brand-to text-white shadow-sm shadow-brand-from/30'
            : 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-card text-brand-from shadow-sm shadow-brand-soft/40 ring-1 ring-border/60'
        }
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-foreground">{value}</div>
        {sub && (
          <div className="truncate text-[11px] text-muted-foreground">{sub}</div>
        )}
      </div>
    </div>
  );
}
