'use client';

import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { formatMoney, formatQuantity } from '@/shared/lib/format';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { ProductCombobox } from '@/features/products/ui/components/ProductCombobox';
import { useRunStockCount } from '../../application/hooks/use-stock-counts';
import type { StockCount } from '../../domain/types';

interface Line {
  productId: string;
  name: string;
  sku: string;
  stock: string;
  countedQty: string;
}

interface Props {
  onClose: () => void;
}

export function CountFormDialog({ onClose }: Props) {
  const run = useRunStockCount();
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StockCount | null>(null);

  const addLine = (p: { id: string; name: string; sku: string; stock: string }) => {
    if (lines.some((l) => l.productId === p.id)) return;
    setLines((prev) => [...prev, { productId: p.id, name: p.name, sku: p.sku, stock: p.stock, countedQty: p.stock }]);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (lines.length === 0) return setError('Agrega al menos un producto al conteo.');
    try {
      const r = await run.mutateAsync({
        notes: notes.trim() || undefined,
        items: lines.map((l) => ({ productId: l.productId, countedQty: l.countedQty })),
      });
      setResult(r);
      setLines([]);
      setNotes('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell open onClose={onClose} title="Nuevo conteo de inventario" size="xl">
      {/* min-h: reserva alto para que el dropdown del combobox de producto se
          despliegue completo sin recortarse ni forzar scroll del modal. */}
      <form onSubmit={onSubmit} className="min-h-[26rem] space-y-5">
        <p className="text-sm text-muted-foreground">
          Registra la cantidad <strong>contada físicamente</strong>. Al completar, el sistema
          ajusta el stock a lo contado y calcula la varianza (merma/sobrante).
        </p>
        <FormField label="Producto">
          <ProductCombobox
            type="simple"
            excludeIds={lines.map((l) => l.productId)}
            onSelect={addLine}
          />
        </FormField>

        {lines.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2 text-right">Stock sistema</th>
                <th className="px-3 py-2 text-right">Contado</th>
                <th className="px-3 py-2 text-right">Dif.</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const diff = Number(l.countedQty || '0') - Number(l.stock);
                return (
                  <tr key={l.productId} className="border-b last:border-0">
                    <td className="px-3 py-2">{l.name} <span className="text-xs text-muted-foreground">{l.sku}</span></td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatQuantity(l.stock)}</td>
                    <td className="px-3 py-2 text-right">
                      <Input inputMode="decimal" keepZero value={l.countedQty}
                        onChange={(e) => setLines((prev) => prev.map((x, j) => (j === i ? { ...x, countedQty: e.target.value } : x)))}
                        className="w-24 text-right" />
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums ${diff === 0 ? 'text-muted-foreground' : diff < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))} title="Quitar">
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <FormField label="Notas">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
        </FormField>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && (
          <div className="rounded-xl border border-emerald-200/60 bg-emerald-50 p-3 text-sm dark:border-emerald-800/50 dark:bg-emerald-950/30">
            Conteo <strong>{result.countNumber}</strong> completado · {result.itemsWithVariance} producto(s) con varianza ·
            merma/sobrante neto:{' '}
            <strong className={Number(result.totalVarianceValue ?? '0') < 0 ? 'text-destructive' : 'text-emerald-700'}>
              {formatMoney(result.totalVarianceValue ?? '0')}
            </strong>
          </div>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={run.isPending}>
            Cerrar
          </Button>
          <Button type="submit" disabled={run.isPending || lines.length === 0}>
            {run.isPending ? 'Procesando…' : 'Completar conteo'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
