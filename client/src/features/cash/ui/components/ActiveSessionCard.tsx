'use client';

import { useState } from 'react';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import {
  useActiveSessionMine,
  useCashRegisters,
  useSessionSummary,
} from '../../application/hooks/use-cash';
import { CloseCashDialog } from './CloseCashDialog';
import { OpenCashDialog } from './OpenCashDialog';

export function ActiveSessionCard() {
  const active = useActiveSessionMine();
  const summary = useSessionSummary(active.data?.id ?? undefined);
  const registers = useCashRegisters();
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);

  if (active.isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
        Cargando estado de caja...
      </div>
    );
  }
  if (active.isError) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
        {getErrorMessage(active.error)}
      </div>
    );
  }

  if (!active.data) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">No tienes caja abierta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Para registrar ventas necesitas abrir una sesión de caja primero.
        </p>
        <button
          type="button"
          onClick={() => setShowOpen(true)}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Abrir caja
        </button>
        {showOpen && (
          <OpenCashDialog
            onClose={() => setShowOpen(false)}
            defaultCashRegisterId={registers.data?.[0]?.id}
          />
        )}
      </div>
    );
  }

  const s = active.data;
  const register = registers.data?.find((r) => r.id === s.cashRegisterId);

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Caja abierta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {register ? `${register.code} · ${register.name}` : s.cashRegisterId} · Abierta{' '}
            {formatDateTime(s.openedAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowClose(true)}
          className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90"
        >
          Cerrar caja
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Monto inicial" value={formatMoney(s.openingAmount)} />
        <Stat label="Ventas efectivo" value={formatMoney(summary.data?.cashSales ?? '0.00')} />
        <Stat
          label="Efectivo esperado"
          value={formatMoney(summary.data?.expectedAmount ?? s.openingAmount)}
          strong
        />
      </div>

      {s.notes && (
        <p className="mt-4 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">{s.notes}</p>
      )}

      {showClose && (
        <CloseCashDialog
          sessionId={s.id}
          onClose={() => setShowClose(false)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 ${strong ? 'text-lg font-semibold' : 'text-base font-medium'}`}>
        {value}
      </div>
    </div>
  );
}
