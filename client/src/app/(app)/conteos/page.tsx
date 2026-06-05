'use client';

import { useState } from 'react';
import { formatMoney } from '@/shared/lib/format';
import { Fab } from '@/shared/ui/controls/Fab';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';
import { useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { useStockCounts } from '@/features/stock-counts/application/hooks/use-stock-counts';
import { CountFormDialog } from '@/features/stock-counts/ui/components/CountFormDialog';
import type { StockCountStatus } from '@/features/stock-counts/domain/types';

const STATUS: Record<StockCountStatus, { label: string; cls: string }> = {
  OPEN: { label: 'Abierto', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
  COMPLETED: { label: 'Completado', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-muted text-muted-foreground' },
};

export default function ConteosPage() {
  const canManage = useHasPermission('inventory.adjust');
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      <SectionHeader title="Conteo de inventario" />

      <CountsList />

      {canManage && (
        <Fab label="Nuevo conteo" onClick={() => setShowCreate(true)} />
      )}
      {showCreate && <CountFormDialog onClose={() => setShowCreate(false)} />}
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
