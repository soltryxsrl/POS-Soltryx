'use client';

import { useState, type ReactNode } from 'react';
import { dayKey, formatDayLabel, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Fab } from '@/shared/ui/controls/Fab';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { useStockCounts } from '@/features/stock-counts/application/hooks/use-stock-counts';
import { CountFormDialog } from '@/features/stock-counts/ui/components/CountFormDialog';
import type { StockCount, StockCountStatus } from '@/features/stock-counts/domain/types';

const GROUP_FETCH_CAP = 2000;

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
  const [groupBy, setGroupBy] = useState<string | undefined>();
  const [groupDir, setGroupDir] = useState<'asc' | 'desc'>('asc');
  // Al agrupar traemos el dataset completo (hasta el tope) para grupos/subtotales
  // correctos; sin agrupar, la vista normal de 100.
  const counts = useStockCounts({ fetchAll: !!groupBy, cap: GROUP_FETCH_CAP });
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
      grouping: {
        key: (c) => dayKey(c.createdAt),
        label: (key) => formatDayLabel(key),
        sortValue: (key) => key, // 'YYYY-MM-DD' ⇒ orden cronológico
      },
      render: (c) => (
        <span className="text-xs text-muted-foreground">
          {new Date(c.createdAt).toLocaleDateString('es-DO')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      grouping: {
        key: (c) => c.status,
        label: (key) => (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[key as StockCountStatus]?.cls ?? ''}`}
          >
            {STATUS[key as StockCountStatus]?.label ?? key}
          </span>
        ),
        sortValue: (key) => STATUS[key as StockCountStatus]?.label ?? key,
      },
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
      aggregate: (rows) => {
        const sum = rows.reduce((acc, c) => acc + Number(c.itemsWithVariance), 0);
        return <span className="font-medium">{sum}</span>;
      },
      render: (c) => <span className="text-muted-foreground">{c.itemsWithVariance}</span>,
    },
    {
      key: 'variance',
      header: 'Merma/sobrante',
      align: 'right',
      aggregate: (rows) => {
        const sum = rows.reduce((acc, c) => acc + Number(c.totalVarianceValue ?? '0'), 0);
        return (
          <span className={`font-medium tabular-nums ${sum < 0 ? 'text-destructive' : ''}`}>
            {formatMoney(sum)}
          </span>
        );
      },
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
      total={groupBy ? (counts.data?.total ?? items.length) : items.length}
      rowKey={(c) => c.id}
      page={1}
      pageSize={Math.max(items.length, 25)}
      onPageChange={() => undefined}
      groupBy={groupBy}
      groupDir={groupDir}
      onGroupByChange={setGroupBy}
      onGroupDirChange={setGroupDir}
      isLoading={counts.isLoading}
      isFetching={counts.isFetching}
      errorMessage={counts.isError ? getErrorMessage(counts.error) : null}
      emptyState="Sin conteos."
      title={title}
      fillHeight={fillHeight}
    />
  );
}
