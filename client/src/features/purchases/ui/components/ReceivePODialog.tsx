'use client';

import { useState, type FormEvent } from 'react';
import { formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { displayNumeric, selectAllOnFocus } from '@/shared/lib/numeric-field';
import { Button } from '@/shared/ui/controls/Button';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useReceivePurchaseOrder } from '../../application/hooks/use-purchases';
import type { PurchaseOrder } from '../../domain/types';

interface Props {
  po: PurchaseOrder;
  onClose: () => void;
}

interface RowInput {
  itemId: string;
  remaining: number;
  quantity: string;
}

export function ReceivePODialog({ po, onClose }: Props) {
  const receive = useReceivePurchaseOrder(po.id);
  const [updateCost, setUpdateCost] = useState(true);
  const [rows, setRows] = useState<RowInput[]>(() =>
    po.items.map((it) => {
      const remaining = parseFloat(it.orderedQuantity) - parseFloat(it.receivedQuantity);
      return {
        itemId: it.id,
        remaining,
        quantity: remaining > 0 ? remaining.toFixed(3) : '0',
      };
    }),
  );
  const [error, setError] = useState<string | null>(null);

  const setQty = (itemId: string, quantity: string) => {
    setRows((r) => r.map((x) => (x.itemId === itemId ? { ...x, quantity } : x)));
  };

  const totalLines = rows.filter((r) => parseFloat(r.quantity) > 0).length;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (totalLines === 0) {
      setError('Ingresa cantidad > 0 en al menos una línea.');
      return;
    }
    for (const r of rows) {
      const q = parseFloat(r.quantity);
      if (q < 0) {
        setError('Las cantidades no pueden ser negativas.');
        return;
      }
      if (q > r.remaining + 0.0001) {
        setError(`Una línea excede lo pendiente por recibir.`);
        return;
      }
    }
    try {
      await receive.mutateAsync({
        items: rows.map((r) => ({ itemId: r.itemId, quantity: r.quantity })),
        updateProductCost: updateCost,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell open onClose={onClose} title={`Recibir orden ${po.orderNumber}`} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Indica cuánto recibió de cada línea ahora. Puede ser parcial — el resto queda
          como pendiente y puedes recibirlo después.
        </p>

        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2 text-right">Pedido</th>
                <th className="px-3 py-2 text-right">Ya recibido</th>
                <th className="px-3 py-2 text-right">Pendiente</th>
                <th className="px-3 py-2 text-right">Recibir ahora</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((it) => {
                const row = rows.find((r) => r.itemId === it.id)!;
                return (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <div className="font-medium">{it.productNameSnapshot}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {it.productSkuSnapshot} · {formatMoney(it.unitCost)} c/u
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{it.orderedQuantity}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {it.receivedQuantity}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {row.remaining.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        max={row.remaining}
                        step="0.001"
                        value={displayNumeric(row.quantity)}
                        onChange={(e) => setQty(it.id, e.target.value)}
                        onFocus={selectAllOnFocus}
                        placeholder="0"
                        disabled={row.remaining <= 0}
                        className="w-24 rounded-lg border border-border/60 bg-background px-2 py-1 text-right text-sm disabled:opacity-50"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={updateCost}
            onChange={(e) => setUpdateCost(e.target.checked)}
            className="rounded border-border"
          />
          Actualizar el costo del producto con el costo de esta recepción
        </label>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={receive.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={receive.isPending}>
            {receive.isPending ? 'Recibiendo...' : 'Confirmar recepción'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
