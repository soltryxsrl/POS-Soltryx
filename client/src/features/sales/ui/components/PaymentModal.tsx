'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { PaymentMethod } from '@/shared/types/enums';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { cn } from '@/shared/lib/cn';
import { computeCartTotals } from '../../application/math/totals';
import { useCartStore } from '../../application/stores/cart.store';
import { useCreateSale } from '../../application/hooks/use-sales';

interface Props {
  cashSessionId: string;
  onClose: () => void;
}

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

export function PaymentModal({ cashSessionId, onClose }: Props) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const totals = computeCartTotals(items);
  const createSale = useCreateSale();

  const [method, setMethod] = useState<string>(PaymentMethod.CASH);
  const [tendered, setTendered] = useState(totals.total);
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  const change = method === PaymentMethod.CASH
    ? Math.max(0, Number(tendered) - Number(totals.total))
    : 0;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (Number(tendered) < Number(totals.total)) {
      setError(`El monto recibido (${formatMoney(tendered)}) es menor al total.`);
      return;
    }
    try {
      const sale = await createSale.mutateAsync({
        cashSessionId,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: String(it.quantity),
          discount: it.discount,
        })),
        payments: [
          {
            method: method as keyof typeof PaymentMethod,
            amount: method === PaymentMethod.CASH ? totals.total : totals.total,
            reference: reference || undefined,
          },
        ],
      });
      clear();
      onClose();
      router.push(`/dashboard/sales/${sale.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell open onClose={onClose} title="Cobrar venta" size="lg">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-brand-tint via-card to-brand-soft p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Total a cobrar
        </div>
        <div className="mt-1 text-3xl font-bold text-foreground">
          {formatMoney(totals.total)}
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <FormField label="Método de pago">
          <div className="grid grid-cols-4 gap-2">
            {Object.values(PaymentMethod).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={cn(
                  'rounded-xl border-2 px-3 py-2 text-sm font-medium transition',
                  method === m
                    ? 'border-brand-from bg-brand-tint text-brand-from'
                    : 'border-border bg-background hover:border-foreground/20',
                )}
              >
                {METHOD_LABEL[m] ?? m}
              </button>
            ))}
          </div>
        </FormField>

        <FormField
          label={method === PaymentMethod.CASH ? 'Efectivo recibido' : 'Monto'}
          required
        >
          <Input
            autoFocus
            value={tendered}
            onChange={(e) => setTendered(e.target.value)}
            pattern="^\d+(\.\d{1,2})?$"
            inputMode="decimal"
            className="text-lg font-medium"
          />
        </FormField>

        {method === PaymentMethod.CASH && change > 0 && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            Vuelto a entregar: <strong>{formatMoney(change)}</strong>
          </p>
        )}

        {method !== PaymentMethod.CASH && (
          <FormField label="Referencia">
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={120}
              placeholder="Últimos 4 dígitos, voucher, etc."
            />
          </FormField>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={createSale.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createSale.isPending}>
            {createSale.isPending ? 'Procesando...' : 'Confirmar venta'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
