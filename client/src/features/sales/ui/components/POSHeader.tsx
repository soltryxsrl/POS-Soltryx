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
    <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
      <Stat
        icon={<UserRound className="h-3.5 w-3.5" />}
        label="Cajero"
        value={user?.fullName ?? '—'}
      />
      <Divider />
      <Stat
        icon={<Warehouse className="h-3.5 w-3.5" />}
        label="Caja"
        value={register?.name ?? register?.code ?? 'CR-001'}
      />
      <Divider />
      <Stat
        icon={<Clock className="h-3.5 w-3.5" />}
        label="Turno"
        value={formatClock(session.openedAt)}
        sub={`hace ${formatElapsed(session.openedAt)}`}
      />
      <Divider />
      <Stat
        icon={<ReceiptText className="h-3.5 w-3.5" />}
        label="Ventas turno"
        value={formatMoney(totalSales.toFixed(2))}
        sub={summary.data ? `Efectivo ${formatMoney(summary.data.cashSales)}` : '…'}
        accent
      />
    </div>
  );
}

function Divider() {
  return <div aria-hidden className="h-7 w-px flex-shrink-0 bg-border/70" />;
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
    <div className="flex shrink-0 items-center gap-2 px-2">
      <div
        className={
          accent
            ? 'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-from to-brand-to text-white shadow-sm shadow-brand-from/30'
            : 'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-card text-brand-from ring-1 ring-border/60'
        }
      >
        {icon}
      </div>
      <div className="flex flex-col whitespace-nowrap leading-tight">
        <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className={
            accent
              ? 'text-sm font-bold tabular-nums text-brand-from'
              : 'text-sm font-semibold text-foreground'
          }
        >
          {value}
          {sub && (
            <span className="ml-1 hidden text-[10px] font-normal text-muted-foreground sm:inline">
              · {sub}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
