'use client';

import { useState, type FormEvent } from 'react';
import { formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import {
  useCloseCashSession,
  useSessionSummary,
} from '../../application/hooks/use-cash';

interface Props {
  sessionId: string;
  onClose: () => void;
  onClosed?: () => void;
}

export function CloseCashDialog({ sessionId, onClose, onClosed }: Props) {
  const summary = useSessionSummary(sessionId);
  const closeMut = useCloseCashSession(sessionId);
  const [countedAmount, setCountedAmount] = useState('0.00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await closeMut.mutateAsync({ countedAmount, notes: notes || undefined });
      onClosed?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const expected = summary.data?.expectedAmount;
  const counted = parseFloat(countedAmount);
  const expectedNum = expected ? parseFloat(expected) : 0;
  const diff = !isNaN(counted) ? counted - expectedNum : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Cerrar caja</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuenta el efectivo físico y compara con el esperado.
        </p>

        {summary.data && (
          <dl className="mt-4 space-y-1 rounded-md border bg-muted/40 p-4 text-sm">
            <SummaryRow label="Monto inicial" value={formatMoney(summary.data.openingAmount)} />
            <SummaryRow label="Ventas efectivo" value={`+${formatMoney(summary.data.cashSales)}`} />
            <SummaryRow label="Devoluciones" value={`-${formatMoney(summary.data.cashRefunds)}`} />
            <SummaryRow
              label="Efectivo esperado"
              value={formatMoney(summary.data.expectedAmount)}
              strong
            />
            <SummaryRow
              label="No-efectivo (informativo)"
              value={formatMoney(summary.data.nonCashSales)}
              muted
            />
          </dl>
        )}

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Efectivo contado físicamente</label>
            <input
              required
              autoFocus
              value={countedAmount}
              onChange={(e) => setCountedAmount(e.target.value)}
              pattern="^\d+(\.\d{1,2})?$"
              inputMode="decimal"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {diff !== null && expected && (
              <p
                className={`text-xs ${
                  diff === 0
                    ? 'text-green-700'
                    : diff > 0
                      ? 'text-amber-700'
                      : 'text-destructive'
                }`}
              >
                Diferencia previa: {diff >= 0 ? '+' : ''}
                {formatMoney(diff)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              placeholder="Ej: faltó cambio, sobraron propinas..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm transition hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={closeMut.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {closeMut.isPending ? 'Cerrando...' : 'Cerrar caja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-4 ${muted ? 'text-muted-foreground text-xs' : ''}`}>
      <dt>{label}</dt>
      <dd className={strong ? 'font-semibold' : ''}>{value}</dd>
    </div>
  );
}
