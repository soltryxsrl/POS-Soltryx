'use client';

import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useProduct } from '@/features/products/application/hooks/use-products';
import { formatQuantity } from '@/shared/lib/format';
import { useAdjustStock } from '../../application/hooks/use-inventory';

interface Props {
  productId: string;
  onClose: () => void;
}

/**
 * Modal simple para ajuste manual de stock. Cantidad con signo: "+5" o "-3".
 */
export function AdjustStockDialog({ productId, onClose }: Props) {
  const product = useProduct(productId);
  const adjust = useAdjustStock();
  const [quantity, setQuantity] = useState('+0');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Normaliza: si no trae signo, agrégale "+"
      const q = /^[+-]/.test(quantity) ? quantity : `+${quantity}`;
      await adjust.mutateAsync({ productId, quantity: q, reason });
      onClose();
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
        className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Ajustar stock</h2>
        {product.data && (
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium">{product.data.name}</span>
            {' · '}
            <span>Stock actual: {formatQuantity(product.data.stock)}</span>
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="qty" className="text-sm font-medium">
              Cantidad (usar + para sumar, - para restar)
            </label>
            <input
              id="qty"
              required
              autoFocus
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              pattern="^[+-]?\d+(\.\d{1,3})?$"
              inputMode="decimal"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Ejemplos: <code>+10</code> (entran 10), <code>-3</code> (rotura), <code>-1.500</code>
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reason" className="text-sm font-medium">
              Motivo (mínimo 3 caracteres)
            </label>
            <input
              id="reason"
              required
              minLength={3}
              maxLength={255}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Rotura, Conteo físico, Donación..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              disabled={adjust.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {adjust.isPending ? 'Guardando...' : 'Aplicar ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
