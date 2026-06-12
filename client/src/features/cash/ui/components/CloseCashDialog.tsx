'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Textarea } from '@/shared/ui/controls/Textarea';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import {
  emptyDenominations,
  pruneDenominations,
  sumDenominations,
} from '../../application/math/denominations';
import {
  useCloseCashSession,
  useSessionReport,
  useSessionSummary,
} from '../../application/hooks/use-cash';
import type { DenominationCounts } from '../../domain/types';
import { usePaymentMethodLabel } from '@/features/payment-methods/application/hooks/use-payment-methods';
import { DenominationCounter } from './DenominationCounter';

interface Props {
  sessionId: string;
  onClose: () => void;
  onClosed?: () => void;
}

type Mode = 'amount' | 'denominations';

export function CloseCashDialog({ sessionId, onClose, onClosed }: Props) {
  const labelOf = usePaymentMethodLabel();
  const summary = useSessionSummary(sessionId);
  const report = useSessionReport(sessionId);
  const closeMut = useCloseCashSession(sessionId);
  const [mode, setMode] = useState<Mode>('amount');
  const [countedAmount, setCountedAmount] = useState('0.00');
  const [denominations, setDenominations] = useState<DenominationCounts>(emptyDenominations);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Mapa methodCode → monto declarado por el cajero (solo non-CASH; CASH usa
  // countedAmount). Editable por el cajero.
  const [declaredByMethod, setDeclaredByMethod] = useState<Record<string, string>>({});

  // Pre-pueble los inputs con los totales del sistema la primera vez que el
  // report se resuelve. Si el cajero ya tocó algún campo no lo pisamos.
  const nonCashMethods = useMemo(
    () => (report.data?.byMethod ?? []).filter((r) => r.method !== 'CASH'),
    [report.data?.byMethod],
  );
  useEffect(() => {
    if (nonCashMethods.length === 0) return;
    setDeclaredByMethod((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const initial: Record<string, string> = {};
      for (const m of nonCashMethods) initial[m.method] = m.total;
      return initial;
    });
  }, [nonCashMethods]);

  const effectiveAmount = useMemo(
    () => (mode === 'denominations' ? sumDenominations(denominations) : countedAmount),
    [mode, denominations, countedAmount],
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Construir el mapa completo: CASH = countedAmount, resto = lo que el
      // cajero declaró en el bloque "Cuadre por método". Se omiten métodos
      // que no tuvieron pagos (no aparecen en nonCashMethods).
      const declared: Record<string, string> = {
        CASH: effectiveAmount,
        ...declaredByMethod,
      };
      await closeMut.mutateAsync({
        countedAmount: effectiveAmount,
        closingDenominations:
          mode === 'denominations' ? pruneDenominations(denominations) : undefined,
        closingDeclaredByMethod: declared,
        notes: notes || undefined,
      });
      onClosed?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const expected = summary.data?.expectedAmount;
  const counted = parseFloat(effectiveAmount);
  const expectedNum = expected ? parseFloat(expected) : 0;
  const diff = !isNaN(counted) ? counted - expectedNum : null;

  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title="Cerrar caja"
      size="lg"
      disableClose={closeMut.isPending}
    >
      {summary.data && (
        <dl className="space-y-1 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <SummaryRow label="Monto inicial" value={formatMoney(summary.data.openingAmount)} />
          <SummaryRow label="Ventas efectivo" value={`+${formatMoney(summary.data.cashSales)}`} />
          <SummaryRow label="Devoluciones" value={`-${formatMoney(summary.data.cashRefunds)}`} />
          <SummaryRow label="Entradas de efectivo" value={`+${formatMoney(summary.data.paidIns)}`} />
          <SummaryRow label="Salidas de efectivo" value={`-${formatMoney(summary.data.paidOuts)}`} />
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

      <form onSubmit={onSubmit} className="mt-4 space-y-5">
        <FormField label="Cómo registrar el conteo">
          <div className="grid grid-cols-2 gap-2">
            <ModeButton
              active={mode === 'amount'}
              onClick={() => setMode('amount')}
              title="Solo total"
              subtitle="Rápido"
            />
            <ModeButton
              active={mode === 'denominations'}
              onClick={() => setMode('denominations')}
              title="Por denominación"
              subtitle="Auditable"
            />
          </div>
        </FormField>

        {mode === 'amount' ? (
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
        ) : (
          <DenominationCounter
            value={denominations}
            onChange={setDenominations}
            expectedTotal={expected ?? undefined}
          />
        )}

        {/* Cuadre por método (no-efectivo). Solo aparece si hay pagos no-CASH. */}
        {nonCashMethods.length > 0 && (
          <div className="space-y-2 rounded-xl border border-border bg-card p-3">
            <div className="text-sm font-semibold">
              Cuadre por forma de pago (no-efectivo)
            </div>
            <p className="text-[11px] text-muted-foreground">
              Declara lo que viste en el batch del POS de tarjeta / extracto
              bancario. Diferencia vs sistema queda registrada en el cierre.
            </p>
            <div className="space-y-2">
              {nonCashMethods.map((m) => {
                const declared = declaredByMethod[m.method] ?? '0.00';
                const diff =
                  parseFloat(declared || '0') - parseFloat(m.total || '0');
                return (
                  <div key={m.method} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                    <div>
                      <div className="text-sm font-medium">
                        {labelOf(m.method)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Sistema: {formatMoney(m.total)} · {m.count}{' '}
                        {m.count === 1 ? 'pago' : 'pagos'}
                      </div>
                    </div>
                    <Input
                      value={declared}
                      onChange={(e) =>
                        setDeclaredByMethod((prev) => ({
                          ...prev,
                          [m.method]: e.target.value,
                        }))
                      }
                      pattern="^\d+(\.\d{1,2})?$"
                      inputMode="decimal"
                      className="w-28 text-right"
                    />
                    <span
                      className={cn(
                        'w-20 text-right text-xs tabular-nums',
                        diff === 0
                          ? 'text-emerald-600'
                          : diff > 0
                            ? 'text-amber-600'
                            : 'text-red-600',
                      )}
                    >
                      {diff >= 0 ? '+' : ''}
                      {formatMoney(diff)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

function ModeButton({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border-2 px-3 py-2 text-left transition',
        active
          ? 'border-brand-from bg-brand-tint'
          : 'border-border bg-background hover:border-foreground/20',
      )}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </button>
  );
}
