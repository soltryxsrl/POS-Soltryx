'use client';

import { useState, type FormEvent } from 'react';
import { formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Textarea } from '@/shared/ui/controls/Textarea';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
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
    <MaintenanceShell open onClose={onClose} title="Cerrar caja" size="lg">
      {summary.data && (
        <dl className="space-y-1 rounded-xl border border-border bg-muted/40 p-4 text-sm">
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
        <FormField
          label="Efectivo contado físicamente"
          required
          hint={
            diff !== null && expected ? (
              <span
                className={
                  diff === 0
                    ? 'text-emerald-600'
                    : diff > 0
                      ? 'text-amber-600'
                      : 'text-red-600'
                }
              >
                Diferencia previa: {diff >= 0 ? '+' : ''}
                {formatMoney(diff)}
              </span>
            ) : undefined
          }
        >
          <Input
            required
            autoFocus
            value={countedAmount}
            onChange={(e) => setCountedAmount(e.target.value)}
            pattern="^\d+(\.\d{1,2})?$"
            inputMode="decimal"
          />
        </FormField>

        <FormField label="Notas">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            placeholder="Ej: faltó cambio, sobraron propinas..."
            className="min-h-[80px]"
          />
        </FormField>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={closeMut.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={closeMut.isPending}>
            {closeMut.isPending ? 'Cerrando...' : 'Cerrar caja'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
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
