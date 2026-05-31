'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { Input } from '@/shared/ui/controls/Input';
import {
  useKitComponents,
  useProducts,
  useSetKitComponents,
} from '../../application/hooks/use-products';

interface Props {
  productId: string;
}

interface DraftRow {
  productId: string;
  quantity: string;
}

export function KitComponentsManager({ productId }: Props) {
  const existing = useKitComponents(productId);
  // Cargamos un set amplio de productos para que el dueño busque por nombre/SKU.
  // El backend tope `limit` a 200; si el catálogo crece, sustituir por buscador async.
  const products = useProducts({ isActive: true, limit: 200 });
  const setComponents = useSetKitComponents(productId);

  const [rows, setRows] = useState<DraftRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const seeded = useMemo<DraftRow[]>(
    () =>
      (existing.data ?? []).map((c) => ({
        productId: c.componentProductId,
        quantity: c.quantity,
      })),
    [existing.data],
  );

  const current = rows ?? seeded;
  const candidates = (products.data?.items ?? []).filter((p) => !p.isKit && p.id !== productId);

  const updateRow = (idx: number, patch: Partial<DraftRow>) => {
    setRows((r) => {
      const base = r ?? seeded;
      return base.map((row, i) => (i === idx ? { ...row, ...patch } : row));
    });
  };

  const removeRow = (idx: number) => {
    setRows((r) => {
      const base = r ?? seeded;
      return base.filter((_, i) => i !== idx);
    });
  };

  const addRow = () => {
    setRows((r) => {
      const base = r ?? seeded;
      // sugerir como producto vacío que el usuario debe llenar.
      return [...base, { productId: '', quantity: '1' }];
    });
  };

  const onSave = async () => {
    setError(null);
    const cleaned = current
      .filter((r) => r.productId && Number(r.quantity) > 0)
      .map((r) => ({ productId: r.productId, quantity: r.quantity }));
    const ids = cleaned.map((r) => r.productId);
    if (new Set(ids).size !== ids.length) {
      setError('Hay componentes duplicados.');
      return;
    }
    try {
      await setComponents.mutateAsync({ components: cleaned });
      setRows(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (existing.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando componentes...</p>;
  }
  if (existing.isError) {
    return <p className="text-sm text-destructive">{getErrorMessage(existing.error)}</p>;
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">
        Define la receta del kit. Al vender 1 unidad de este combo se descuenta
        del stock cada componente según la cantidad indicada.
      </p>

      {current.length === 0 && (
        <p className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
          Este kit todavía no tiene componentes.
        </p>
      )}

      <ul className="space-y-2">
        {current.map((row, idx) => (
          <li
            key={idx}
            className="grid grid-cols-[1fr_120px_36px] items-center gap-2"
          >
            <select
              value={row.productId}
              onChange={(e) => updateRow(idx, { productId: e.target.value })}
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
            >
              <option value="">Seleccione componente</option>
              {candidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.sku}
                </option>
              ))}
            </select>
            <Input
              value={row.quantity}
              onChange={(e) => updateRow(idx, { quantity: e.target.value })}
              inputMode="decimal"
              pattern="^\d+(\.\d{1,3})?$"
              className="text-right"
            />
            <button
              type="button"
              onClick={() => removeRow(idx)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
              title="Quitar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addRow}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Agregar componente
      </button>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t pt-3">
        {rows !== null && (
          <Button
            variant="outline"
            onClick={() => setRows(null)}
            disabled={setComponents.isPending}
          >
            Descartar cambios
          </Button>
        )}
        <Button
          onClick={onSave}
          disabled={setComponents.isPending || rows === null}
        >
          {setComponents.isPending ? 'Guardando...' : 'Guardar receta'}
        </Button>
      </div>
    </div>
  );
}
