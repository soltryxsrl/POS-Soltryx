'use client';

import { useState, type ReactNode } from 'react';
import { formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Fab } from '@/shared/ui/controls/Fab';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { useStockCounts } from '@/features/stock-counts/application/hooks/use-stock-counts';
import { CountFormDialog } from '@/features/stock-counts/ui/components/CountFormDialog';
import type { StockCount, StockCountStatus } from '@/features/stock-counts/domain/types';

const STATUS: Record<StockCountStatus, { label: string; cls: string }> = {
  OPEN: { label: 'Abierto', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
  COMPLETED: { label: 'Completado', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-muted text-muted-foreground' },
};

export default function ConteosPage() {
  const canManage = useHasPermission('inventory.adjust');
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <CountsList fillHeight title="Conteo de inventario" />

      {canManage && (
        <Fab label="Nuevo conteo" onClick={() => setShowCreate(true)} />
      )}
      {showCreate && <CountFormDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CountsList({ fillHeight, title }: { fillHeight?: boolean; title?: ReactNode }) {
  const counts = useStockCounts();
  const items = counts.data?.items ?? [];

  const columns: DataTableColumn<StockCount>[] = [
    {
      key: 'countNumber',
      header: 'N°',
      render: (c) => <span className="font-mono text-xs">{c.countNumber}</span>,
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (c) => (
        <span className="text-xs text-muted-foreground">
          {new Date(c.createdAt).toLocaleDateString('es-DO')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (c) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[c.status].cls}`}>
          {STATUS[c.status].label}
        </span>
      ),
    },
    {
      key: 'itemsWithVariance',
      header: 'Con varianza',
      align: 'right',
      render: (c) => <span className="text-muted-foreground">{c.itemsWithVariance}</span>,
    },
    {
      key: 'variance',
      header: 'Merma/sobrante',
      align: 'right',
      render: (c) => (
        <span
          className={`font-medium tabular-nums ${Number(c.totalVarianceValue ?? '0') < 0 ? 'text-destructive' : ''}`}
        >
          {c.totalVarianceValue !== null ? formatMoney(c.totalVarianceValue) : '—'}
        </span>
      ),
    },
  ];

  return (
    <DataTable<StockCount>
      columns={columns}
      rows={items}
      total={items.length}
      rowKey={(c) => c.id}
      page={1}
      pageSize={Math.max(items.length, 25)}
      onPageChange={() => undefined}
      isLoading={counts.isLoading}
      isFetching={counts.isFetching}
      errorMessage={counts.isError ? getErrorMessage(counts.error) : null}
      emptyState="Sin conteos."
      title={title}
      fillHeight={fillHeight}
    />
  );
}
