'use client';

import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { useCashMovements } from '../../application/hooks/use-cash';

interface Props {
  sessionId: string;
}

export function CashMovementsList({ sessionId }: Props) {
  const movements = useCashMovements(sessionId);

  if (movements.isLoading) {
    return (
      <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Cargando movimientos...
      </p>
    );
  }
  if (!movements.data || movements.data.length === 0) {
    return (
      <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Aún no hay pay-ins ni pay-outs en este turno.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {movements.data.map((m) => {
        const isIn = m.type === 'PAID_IN';
        return (
          <li key={m.id} className="flex items-start gap-3 px-3 py-2.5">
            <span
              className={
                'mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md ' +
                (isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')
              }
            >
              {isIn ? (
                <ArrowDownToLine className="h-4 w-4" />
              ) : (
                <ArrowUpFromLine className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-sm font-medium">
                  {isIn ? 'Entrada' : 'Salida'}
                </div>
                <div
                  className={
                    'text-sm font-semibold ' +
                    (isIn ? 'text-emerald-700' : 'text-amber-700')
                  }
                >
                  {isIn ? '+' : '−'}
                  {formatMoney(m.amount)}
                </div>
              </div>
              <p className="break-words text-xs text-muted-foreground">{m.reason}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatDateTime(m.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
