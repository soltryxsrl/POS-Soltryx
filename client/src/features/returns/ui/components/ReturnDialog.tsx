'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Undo2 } from 'lucide-react';
import { formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { cn } from '@/shared/lib/cn';
import { displayNumeric, selectAllOnFocus } from '@/shared/lib/numeric-field';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Textarea } from '@/shared/ui/controls/Textarea';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import {
  useCreateReturn,
  useReturnableItems,
} from '../../application/hooks/use-returns';
import type { RefundMethod } from '../../domain/types';

interface Props {
  saleId: string;
  saleNumber: string;
  saleHadAccountPayment: boolean;
  saleHasCustomer: boolean;
  onClose: () => void;
}

const REFUND_LABELS: Record<RefundMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  STORE_CREDIT: 'Crédito a cuenta',
  ACCOUNT: 'Reducir crédito',
  OTHER: 'Otro',
};

export function ReturnDialog({
  saleId,
  saleNumber,
  saleHadAccountPayment,
  saleHasCustomer,
  onClose,
}: Props) {
  const items = useReturnableItems(saleId);
  const create = useCreateReturn();
  const [qtyByItem, setQtyByItem] = useState<Record<string, string>>({});
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('CASH');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const setQty = (saleItemId: string, q: string) =>
    setQtyByItem((s) => ({ ...s, [saleItemId]: q }));

  const totals = useMemo(() => {
    if (!items.data) return { subtotal: 0, tax: 0, total: 0 };
    let subC = 0;
    let taxC = 0;
    for (const it of items.data) {
      const q = parseFloat(qtyByItem[it.saleItemId] ?? '0') || 0;
      if (q <= 0) continue;
      const unitC = Math.round(parseFloat(it.unitPrice) * 100);
      const sub = Math.round(unitC * q);
      const taxBp = Math.round(parseFloat(it.taxRate) * 100);
      const tax = Math.round((sub * taxBp) / (100 * 100));
      subC += sub;
      taxC += tax;
    }
    return {
      subtotal: subC / 100,
      tax: taxC / 100,
      total: (subC + taxC) / 100,
    };
  }, [items.data, qtyByItem]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const lines = Object.entries(qtyByItem)
      .filter(([, q]) => parseFloat(q) > 0)
      .map(([saleItemId, quantity]) => ({ saleItemId, quantity }));
    if (lines.length === 0) {
      setError('Indica cantidad > 0 en al menos un ítem.');
      return;
    }
    if (
      (refundMethod === 'STORE_CREDIT' || refundMethod === 'ACCOUNT') &&
      !saleHasCustomer
    ) {
      setError(
        'Esta venta no tiene cliente asignado, por lo que no se puede usar crédito ni reducir saldo.',
      );
      return;
    }
    if (refundMethod === 'ACCOUNT' && !saleHadAccountPayment) {
      setError(
        'Solo se puede reducir crédito si la venta original incluyó un pago a crédito.',
      );
      return;
    }
    try {
      await create.mutateAsync({
        saleId,
        refundMethod,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
        items: lines,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const refundOptions: RefundMethod[] = [
    'CASH',
    'CARD',
    'TRANSFER',
    'OTHER',
    ...(saleHasCustomer
      ? (['STORE_CREDIT'] as RefundMethod[])
      : []),
    ...(saleHadAccountPayment ? (['ACCOUNT'] as RefundMethod[]) : []),
  ];

  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title={`Devolución sobre ${saleNumber}`}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Selecciona los ítems y la cantidad a devolver. Puede ser parcial.
          El stock se restituye automáticamente.
        </p>

        <div className="overflow-hidden rounded-xl border">
          {items.isLoading && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Cargando ítems...
            </p>
          )}
          {items.isError && (
            <p className="px-3 py-6 text-center text-sm text-destructive">
              {getErrorMessage(items.error)}
            </p>
          )}
          {items.data && (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2 text-right">Vendido</th>
                  <th className="px-3 py-2 text-right">Ya devuelto</th>
                  <th className="px-3 py-2 text-right">Pendiente</th>
                  <th className="px-3 py-2 text-right">Devolver</th>
                </tr>
              </thead>
              <tbody>
                {items.data.map((it) => {
                  const remaining = parseFloat(it.remaining);
                  return (
                    <tr key={it.saleItemId} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <div className="font-medium">{it.productName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {it.productSku} · {formatMoney(it.unitPrice)} c/u
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">{it.orderedQuantity}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {it.alreadyReturned}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {it.remaining}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={remaining}
                          step="0.001"
                          value={displayNumeric(qtyByItem[it.saleItemId] ?? '')}
                          onChange={(e) => setQty(it.saleItemId, e.target.value)}
                          onFocus={selectAllOnFocus}
                          disabled={remaining <= 0}
                          placeholder="0"
                          className="w-24 rounded-lg border border-border/60 bg-background px-2 py-1 text-right text-sm disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t bg-muted/30">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right text-xs">
                    Subtotal
                  </td>
                  <td className="px-3 py-2 text-right">{formatMoney(totals.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right text-xs">
                    ITBIS
                  </td>
                  <td className="px-3 py-2 text-right">{formatMoney(totals.tax)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right text-sm font-semibold">
                    Total a reembolsar
                  </td>
                  <td className="px-3 py-2 text-right text-base font-bold">
                    {formatMoney(totals.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <FormField label="Método de reembolso">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {refundOptions.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setRefundMethod(m)}
                className={cn(
                  'rounded-xl border-2 px-3 py-2 text-sm font-medium transition',
                  refundMethod === m
                    ? 'border-brand-from bg-brand-tint text-brand-from'
                    : 'border-border bg-background hover:border-foreground/20',
                )}
              >
                {REFUND_LABELS[m]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {refundMethod === 'STORE_CREDIT' &&
              'Se acreditará a la cuenta del cliente (queda saldo a favor).'}
            {refundMethod === 'ACCOUNT' &&
              'Se reducirá la deuda del cliente en su cuenta corriente.'}
            {refundMethod === 'CASH' &&
              'Sale del efectivo de la caja activa.'}
          </p>
        </FormField>

        <FormField label="Motivo">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={255}
            placeholder="Ej: Producto defectuoso, cliente cambió de opinión..."
          />
        </FormField>

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
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending}>
            <Undo2 className="mr-2 h-4 w-4" />
            {create.isPending ? 'Registrando...' : 'Confirmar devolución'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
