'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { PaymentMethod } from '@/shared/types/enums';
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

/**
 * Modal de cobro: elige método y monto. Permite mezclar (Fase futura),
 * pero para MVP soportamos un solo método por venta.
 */
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
            // En CASH guardamos el total exacto en `amount`; el cambio es físico.
            // En no-CASH, `amount` = total (tarjeta no da vuelto).
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Cobrar venta</h2>
        <p className="mt-1 text-2xl font-bold">{formatMoney(totals.total)}</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Método de pago</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.values(PaymentMethod).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`rounded-md border px-3 py-2 text-sm transition ${
                    method === m
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  {METHOD_LABEL[m] ?? m}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {method === PaymentMethod.CASH ? 'Efectivo recibido' : 'Monto'}
            </label>
            <input
              autoFocus
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              pattern="^\d+(\.\d{1,2})?$"
              inputMode="decimal"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-medium"
            />
          </div>

          {method === PaymentMethod.CASH && change > 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Vuelto a entregar: <strong>{formatMoney(change)}</strong>
            </p>
          )}

          {method !== PaymentMethod.CASH && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Referencia (opcional)</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={120}
                placeholder="Últimos 4 dígitos, voucher, etc."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          )}

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
              disabled={createSale.isPending}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {createSale.isPending ? 'Procesando...' : 'Confirmar venta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
