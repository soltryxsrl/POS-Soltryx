'use client';

import { useState, type FormEvent } from 'react';
import { formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { cn } from '@/shared/lib/cn';
import { PaymentMethod } from '@/shared/types/enums';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Textarea } from '@/shared/ui/controls/Textarea';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import {
  PAYMENT_METHOD_CANONICAL_LABEL,
  usePaymentMethods,
} from '@/features/payment-methods/application/hooks/use-payment-methods';
import { useRegisterAccountPayment } from '../../application/hooks/use-customers';

interface Props {
  customerId: string;
  customerName: string;
  currentBalance: string;
  onClose: () => void;
}

type AbonoMethod = Exclude<PaymentMethod, 'ACCOUNT'>;

// Métodos válidos para abonar crédito (todos menos ACCOUNT — no se paga crédito
// con crédito). Respaldo cuando el catálogo aún no cargó.
const FALLBACK_ABONO: AbonoMethod[] = ['CASH', 'CARD', 'TRANSFER', 'OTHER'];

export function AbonoDialog({
  customerId,
  customerName,
  currentBalance,
  onClose,
}: Props) {
  const mut = useRegisterAccountPayment(customerId);
  const paymentMethods = usePaymentMethods({ activeOnly: true });
  const abonoMethods =
    paymentMethods.data && paymentMethods.data.length > 0
      ? paymentMethods.data
          .filter((m) => m.code !== 'ACCOUNT')
          .map((m) => ({
            code: m.code as AbonoMethod,
            name: m.name,
            requiresReference: m.requiresReference,
          }))
      : FALLBACK_ABONO.map((code) => ({
          code,
          name: PAYMENT_METHOD_CANONICAL_LABEL[code],
          requiresReference: code !== 'CASH',
        }));
  const [amount, setAmount] = useState(currentBalance);
  const [method, setMethod] = useState<AbonoMethod>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const balanceNum = parseFloat(currentBalance);
  const amountNum = parseFloat(amount) || 0;
  const remainingAfter = balanceNum - amountNum;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (amountNum <= 0) {
      setError('El monto debe ser mayor que cero.');
      return;
    }
    try {
      await mut.mutateAsync({
        amount,
        paymentMethod: method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell open onClose={onClose} title="Registrar abono" size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-xl border bg-muted/40 p-3 text-sm">
          <div className="text-xs text-muted-foreground">Cliente</div>
          <div className="font-medium">{customerName}</div>
          <div className="mt-2 text-xs text-muted-foreground">Saldo actual</div>
          <div className="text-lg font-semibold">{formatMoney(currentBalance)}</div>
        </div>

        <FormField label="Monto a abonar" required>
          <Input
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            pattern="^\d+(\.\d{1,2})?$"
            inputMode="decimal"
            className="text-lg font-medium"
          />
          {remainingAfter >= 0 && balanceNum > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Saldo después del abono: {formatMoney(remainingAfter)}
            </p>
          )}
          {remainingAfter < 0 && (
            <p className="mt-1 text-xs text-amber-600">
              El abono excede el saldo en {formatMoney(Math.abs(remainingAfter))}.
              Quedará saldo a favor del cliente.
            </p>
          )}
        </FormField>

        <FormField label="Cómo recibió el abono">
          <div className="grid grid-cols-2 gap-2">
            {abonoMethods.map(({ code, name }) => (
              <button
                key={code}
                type="button"
                onClick={() => setMethod(code)}
                className={cn(
                  'rounded-xl border-2 px-3 py-2 text-sm font-medium transition',
                  method === code
                    ? 'border-brand-from bg-brand-tint text-brand-from'
                    : 'border-border bg-background hover:border-foreground/20',
                )}
              >
                {name}
              </button>
            ))}
          </div>
        </FormField>

        {(abonoMethods.find((m) => m.code === method)?.requiresReference ??
          method !== 'CASH') && (
          <FormField label="Referencia">
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={120}
              placeholder="Últimos 4 dígitos, voucher..."
            />
          </FormField>
        )}

        <FormField label="Notas">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            className="min-h-[60px]"
          />
        </FormField>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending ? 'Registrando...' : 'Confirmar abono'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
