'use client';

import { formatMoney } from '@/shared/lib/format';
import { computeCartTotals } from '../../application/math/totals';
import { useCartStore } from '../../application/stores/cart.store';

interface Props {
  onCheckout: () => void;
}

export function Cart({ onCheckout }: Props) {
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);

  const totals = computeCartTotals(items);
  const canCheckout = items.length > 0 && Number(totals.total) > 0;

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Carrito ({items.length})</h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Vaciar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Agrega productos desde la izquierda.
          </p>
        )}
        {items.map((it) => {
          const lineSubtotal = Number(it.unitPrice) * it.quantity;
          return (
            <div key={it.productId} className="rounded-md border bg-background p-3 mb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="line-clamp-1 text-sm font-medium">{it.productName}</div>
                  <div className="text-xs text-muted-foreground">
                    {it.sku} · {formatMoney(it.unitPrice)} c/u
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(it.productId)}
                  className="text-xs text-destructive hover:underline"
                >
                  Quitar
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(it.productId, it.quantity - 1)}
                  className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={it.quantity}
                  onChange={(e) => setQuantity(it.productId, Number(e.target.value) || 0)}
                  className="w-16 rounded-md border border-input bg-background px-2 py-1 text-center text-sm"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(it.productId, it.quantity + 1)}
                  className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                >
                  +
                </button>
                <span className="ml-auto text-sm font-medium">{formatMoney(lineSubtotal)}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Desc.</label>
                <input
                  value={it.discount}
                  onChange={(e) => setDiscount(it.productId, e.target.value)}
                  pattern="^\d+(\.\d{1,2})?$"
                  inputMode="decimal"
                  className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 border-t p-4">
        <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
        <Row label="Descuento" value={`−${formatMoney(totals.discountTotal)}`} />
        <Row label="ITBIS / Impuestos" value={formatMoney(totals.taxTotal)} />
        <div className="my-2 border-t" />
        <Row label="Total" value={formatMoney(totals.total)} strong />

        <button
          type="button"
          onClick={onCheckout}
          disabled={!canCheckout}
          className="mt-3 w-full rounded-md bg-primary px-4 py-3 text-base font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          Cobrar
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${strong ? 'text-base font-semibold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
