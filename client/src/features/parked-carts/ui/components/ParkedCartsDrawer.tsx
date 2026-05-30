'use client';

import { useState } from 'react';
import { Clock, Play, Trash2, X } from 'lucide-react';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { cn } from '@/shared/lib/cn';
import { useCartStore } from '@/features/sales/application/stores/cart.store';
import {
  useDeleteParkedCart,
  useParkedCarts,
} from '../../application/hooks/use-parked-carts';
import type { ParkedCart } from '../../domain/types';

interface Props {
  cashSessionId: string;
  open: boolean;
  onClose: () => void;
}

export function ParkedCartsDrawer({ cashSessionId, open, onClose }: Props) {
  const query = useParkedCarts(open ? cashSessionId : undefined);
  const del = useDeleteParkedCart();
  const loadCart = useCartStore((s) => s.loadCart);
  const cartHasItems = useCartStore((s) => s.items.length > 0);
  const [warnReplace, setWarnReplace] = useState<ParkedCart | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const resume = async (cart: ParkedCart) => {
    setError(null);
    try {
      const items = cart.payload.items.map((it) => {
        const variantId = it.variantId ?? null;
        const lineKey = it.productId
          ? variantId
            ? `${it.productId}:${variantId}`
            : it.productId
          : `open:${Math.random().toString(36).slice(2)}`;
        return {
          lineKey,
          productId: it.productId,
          variantId,
          variantName: it.variantName ?? null,
          productName: it.productName,
          sku: it.sku,
          unitPrice: it.unitPrice,
          taxRate: it.taxRate,
          quantity: it.quantity,
          discount: it.discount,
          notes: it.notes ?? null,
        };
      });
      loadCart(items, cart.payload.orderDiscount);
      await del.mutateAsync(cart.id);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const remove = async (cart: ParkedCart) => {
    setError(null);
    try {
      await del.mutateAsync(cart.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
      />

      <aside
        role="dialog"
        aria-label="Carritos en espera"
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-card shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-from" />
            <h2 className="text-base font-semibold">Carritos en espera</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="border-b bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3">
          {query.isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Cargando...
            </p>
          )}
          {query.isError && (
            <p className="py-8 text-center text-sm text-destructive">
              {getErrorMessage(query.error)}
            </p>
          )}
          {query.data && query.data.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No hay carritos guardados en este turno.
            </p>
          )}
          {query.data?.map((c) => {
            const total = totalOf(c);
            return (
              <div
                key={c.id}
                className="mb-3 rounded-lg border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {c.label || `Carrito ${c.id.slice(0, 8)}`}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatDateTime(c.createdAt)} · {c.payload.items.length} ítem
                      {c.payload.items.length === 1 ? '' : 's'} ·{' '}
                      {formatMoney(total)}
                    </div>
                  </div>
                </div>

                {c.notes && (
                  <p className="mt-1 break-words text-[11px] text-muted-foreground">
                    {c.notes}
                  </p>
                )}

                <ul className="mt-2 space-y-1 text-xs">
                  {c.payload.items.slice(0, 3).map((it, idx) => (
                    <li key={idx} className="line-clamp-1 text-muted-foreground">
                      {it.quantity}× {it.productName}
                    </li>
                  ))}
                  {c.payload.items.length > 3 && (
                    <li className="text-[10px] text-muted-foreground">
                      + {c.payload.items.length - 3} más...
                    </li>
                  )}
                </ul>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => (cartHasItems ? setWarnReplace(c) : resume(c))}
                    disabled={del.isPending}
                    className={cn(
                      'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50',
                    )}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Retomar
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    disabled={del.isPending}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Descartar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {warnReplace && (
        <ConfirmReplaceDialog
          cart={warnReplace}
          onCancel={() => setWarnReplace(null)}
          onConfirm={async () => {
            const c = warnReplace;
            setWarnReplace(null);
            await resume(c);
          }}
        />
      )}
    </>
  );
}

function totalOf(c: ParkedCart): number {
  let cents = 0;
  for (const it of c.payload.items) {
    const gross = Math.round(Number(it.unitPrice) * 100) * it.quantity;
    const disc = Math.round(Number(it.discount) * 100);
    const taxable = Math.max(0, gross - disc);
    const rate = Math.round(Number(it.taxRate) * 100);
    const tax = Math.round((taxable * rate) / (100 * 100));
    cents += taxable + tax;
  }
  cents -= Math.round(Number(c.payload.orderDiscount) * 100);
  return Math.max(0, cents) / 100;
}

function ConfirmReplaceDialog({
  cart,
  onCancel,
  onConfirm,
}: {
  cart: ParkedCart;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl border bg-card p-5 shadow-xl">
        <h3 className="text-base font-semibold">Reemplazar carrito actual</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Hay items en tu carrito que se descartarán al retomar{' '}
          <strong>{cart.label || 'este carrito'}</strong>.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-destructive px-3 py-1.5 text-sm text-destructive-foreground hover:bg-destructive/90"
          >
            Sí, reemplazar
          </button>
        </div>
      </div>
    </div>
  );
}
