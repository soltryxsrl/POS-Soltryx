'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Star, Trash2 } from 'lucide-react';
import { http } from '@/shared/lib/http-client';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { Input } from '@/shared/ui/controls/Input';
import { productsKey } from '@/features/products/application/hooks/use-products';

interface ProductBarcode {
  id: string;
  productId: string;
  barcode: string;
  isPrimary: boolean;
  createdAt: string;
}

interface Props {
  productId: string;
}

export function BarcodesManager({ productId }: Props) {
  const qc = useQueryClient();
  const key = ['products', 'barcodes', productId] as const;

  const list = useQuery({
    queryKey: key,
    queryFn: () => http<ProductBarcode[]>(`/products/${productId}/barcodes`),
  });
  const add = useMutation({
    mutationFn: (input: { barcode: string; isPrimary?: boolean }) =>
      http<ProductBarcode>(`/products/${productId}/barcodes`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: productsKey.all });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      http<void>(`/products/${productId}/barcodes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: productsKey.all });
    },
  });
  const setPrimary = useMutation({
    mutationFn: (id: string) =>
      http<void>(`/products/${productId}/barcodes/${id}/primary`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: productsKey.all });
    },
  });

  const [newBarcode, setNewBarcode] = useState('');
  const [makePrimary, setMakePrimary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newBarcode.trim().length === 0) {
      setError('Escribe un código.');
      return;
    }
    try {
      await add.mutateAsync({ barcode: newBarcode.trim(), isPrimary: makePrimary });
      setNewBarcode('');
      setMakePrimary(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">
        Un producto puede tener varios códigos (caja vs unidad, código alterno
        de proveedor, etc.). El marcado como <em>principal</em> es el que aparece
        en el ticket.
      </p>

      {list.isLoading && (
        <p className="text-sm text-muted-foreground">Cargando códigos...</p>
      )}
      {list.data?.length === 0 && (
        <p className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
          Este producto no tiene códigos de barras todavía.
        </p>
      )}

      <ul className="divide-y rounded-xl border bg-background">
        {list.data?.map((b) => (
          <li
            key={b.id}
            className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <code className="font-mono">{b.barcode}</code>
              {b.isPrimary && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-medium text-brand-from">
                  <Star className="h-3 w-3 fill-current" />
                  Principal
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!b.isPrimary && (
                <button
                  type="button"
                  onClick={() => setPrimary.mutate(b.id)}
                  disabled={setPrimary.isPending}
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Marcar como principal"
                >
                  Marcar principal
                </button>
              )}
              <button
                type="button"
                onClick={() => remove.mutate(b.id)}
                disabled={remove.isPending}
                className="rounded-md p-1 text-destructive hover:bg-destructive/10"
                title="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={onAdd} className="space-y-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <Input
            value={newBarcode}
            onChange={(e) => setNewBarcode(e.target.value)}
            placeholder="Escanea o escribe un código nuevo"
            maxLength={64}
          />
          <Button type="submit" disabled={add.isPending}>
            <Plus className="mr-1 h-4 w-4" />
            Agregar
          </Button>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={makePrimary}
            onChange={(e) => setMakePrimary(e.target.checked)}
            className="rounded border-border"
          />
          Marcar como principal
        </label>
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
