'use client';

import { useState, type FormEvent } from 'react';
import { ClipboardCheck, Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { formatMoney, formatQuantity } from '@/shared/lib/format';
import { Button } from '@/shared/ui/controls/Button';
import { Input } from '@/shared/ui/controls/Input';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';
import { useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { useProducts } from '@/features/products/application/hooks/use-products';
import {
  useRunStockCount,
  useStockCounts,
} from '@/features/stock-counts/application/hooks/use-stock-counts';
import type { StockCount, StockCountStatus } from '@/features/stock-counts/domain/types';

const STATUS: Record<StockCountStatus, { label: string; cls: string }> = {
  OPEN: { label: 'Abierto', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
  COMPLETED: { label: 'Completado', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-muted text-muted-foreground' },
};

interface Line {
  productId: string;
  name: string;
  sku: string;
  stock: string;
  countedQty: string;
}

export default function ConteosPage() {
  const canManage = useHasPermission('inventory.adjust');
  const run = useRunStockCount();
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StockCount | null>(null);

  const found = useProducts({ q: search.trim() || undefined, type: 'simple', limit: 8 });

  const addLine = (p: { id: string; name: string; sku: string; stock: string }) => {
    if (lines.some((l) => l.productId === p.id)) return;
    setLines((prev) => [...prev, { productId: p.id, name: p.name, sku: p.sku, stock: p.stock, countedQty: p.stock }]);
    setSearch('');
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
    <div className="space-y-6">
      <SectionHeader title="Conteo de inventario" />

      {canManage && (
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Registra la cantidad <strong>contada físicamente</strong>. Al completar, el sistema
            ajusta el stock a lo contado y calcula la varianza (merma/sobrante).
          </p>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto por nombre o SKU…" className="w-72" />
          {search.trim() && (
            <div className="rounded-xl border border-border">
              {(found.data?.items ?? []).map((p) => (
                <button key={p.id} type="button" onClick={() => addLine(p)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/40">
                  <span>{p.name} <span className="text-xs text-muted-foreground">{p.sku}</span></span>
                  <span className="text-xs text-muted-foreground">sistema {formatQuantity(p.stock)}</span>
                </button>
              ))}
              {found.data?.items.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Sin productos simples.</p>}
            </div>
          )}

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
                        <Input inputMode="decimal" value={l.countedQty}
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

          <div className="flex items-center gap-3">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional)" className="flex-1" />
            <Button type="submit" disabled={run.isPending || lines.length === 0}>
              <ClipboardCheck className="h-4 w-4" />
              {run.isPending ? 'Procesando…' : 'Completar conteo'}
            </Button>
          </div>
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
        </form>
      )}

      <CountsList />
    </div>
  );
}

function CountsList() {
  const counts = useStockCounts();
  const items = counts.data?.items ?? [];
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5">N°</th>
            <th className="px-4 py-2.5">Fecha</th>
            <th className="px-4 py-2.5">Estado</th>
            <th className="px-4 py-2.5 text-right">Con varianza</th>
            <th className="px-4 py-2.5 text-right">Merma/sobrante</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {counts.isLoading && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Cargando…</td></tr>}
          {!counts.isLoading && items.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Sin conteos.</td></tr>}
          {items.map((c) => (
            <tr key={c.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-mono text-xs">{c.countNumber}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString('es-DO')}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[c.status].cls}`}>{STATUS[c.status].label}</span>
              </td>
              <td className="px-4 py-3 text-right text-muted-foreground">{c.itemsWithVariance}</td>
              <td className={`px-4 py-3 text-right font-medium tabular-nums ${Number(c.totalVarianceValue ?? '0') < 0 ? 'text-destructive' : ''}`}>
                {c.totalVarianceValue !== null ? formatMoney(c.totalVarianceValue) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
