'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { formatDateTime, formatQuantity } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Input } from '@/shared/ui/controls/Input';
import { DataTable, useTableQueryState, type DataTableColumn } from '@/shared/ui/data-table';
import { StockMovementType } from '@/shared/types/enums';
import { useStockMovements } from '../../application/hooks/use-inventory';
import type { StockMovement } from '../../domain/types';

const TYPE_LABEL: Record<string, string> = {
  PURCHASE: 'Compra',
  SALE: 'Venta',
  RETURN: 'Devolución',
  ADJUSTMENT: 'Ajuste',
  CANCELLED_SALE: 'Venta anulada',
};

const TYPE_COLOR: Record<string, string> = {
  PURCHASE: 'bg-green-100 text-green-800',
  SALE: 'bg-red-100 text-red-800',
  RETURN: 'bg-blue-100 text-blue-800',
  ADJUSTMENT: 'bg-amber-100 text-amber-800',
  CANCELLED_SALE: 'bg-purple-100 text-purple-800',
};

const FILTER_KEYS = ['type', 'from', 'to'] as const;

const TYPE_CHIPS: Array<{ value: StockMovementType; label: string }> = [
  { value: StockMovementType.SALE, label: 'Venta' },
  { value: StockMovementType.PURCHASE, label: 'Compra' },
  { value: StockMovementType.ADJUSTMENT, label: 'Ajuste' },
  { value: StockMovementType.RETURN, label: 'Devolución' },
  { value: StockMovementType.CANCELLED_SALE, label: 'Anulada' },
];

export function StockMovementsTable({ productId }: { productId?: string }) {
  const table = useTableQueryState({
    defaultSort: 'createdAt',
    defaultSortDir: 'desc',
    filterKeys: FILTER_KEYS,
  });

  const movements = useStockMovements({
    productId,
    type: (table.filters.type as StockMovementType) || undefined,
    from: dateInputToIso(table.filters.from, 'start'),
    to: dateInputToIso(table.filters.to, 'end'),
    sort: table.sort,
    sortDir: table.sortDir,
    limit: table.pageSize,
    offset: (table.page - 1) * table.pageSize,
  });

  const columns = useMemo<DataTableColumn<StockMovement>[]>(
    () => [
      {
        key: 'createdAt',
        header: 'Fecha',
        sortable: true,
        render: (m) => (
          <span className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</span>
        ),
      },
      {
        key: 'type',
        header: 'Tipo',
        render: (m) => (
          <span className={`rounded-full px-2 py-0.5 text-xs ${TYPE_COLOR[m.type] ?? ''}`}>
            {TYPE_LABEL[m.type] ?? m.type}
          </span>
        ),
      },
      {
        key: 'quantity',
        header: 'Cantidad',
        sortable: true,
        align: 'right',
        render: (m) => {
          const positive = !m.quantity.startsWith('-');
          return (
            <span className={`font-medium ${positive ? 'text-green-700' : 'text-red-700'}`}>
              {positive && !m.quantity.startsWith('+') ? '+' : ''}
              {formatQuantity(m.quantity)}
            </span>
          );
        },
      },
      {
        key: 'previousStock',
        header: 'Stock antes',
        align: 'right',
        render: (m) => formatQuantity(m.previousStock),
      },
      {
        key: 'newStock',
        header: 'Stock después',
        align: 'right',
        render: (m) => formatQuantity(m.newStock),
      },
      {
        key: 'reason',
        header: 'Motivo',
        render: (m) => <span className="text-muted-foreground">{m.reason ?? '—'}</span>,
      },
    ],
    [],
  );

  const hasFilters = FILTER_KEYS.some((k) => !!table.filters[k]);

  const toolbar = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {TYPE_CHIPS.map((c) => (
          <Chip
            key={c.value}
            label={c.label}
            active={table.filterDraft.type === c.value}
            onClick={() =>
              table.setFilter('type', table.filterDraft.type === c.value ? undefined : c.value)
            }
          />
        ))}
        {hasFilters && (
          <button
            type="button"
            onClick={() => table.clearFilters()}
            className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Rango fecha:</span>
        <Input
          type="date"
          value={table.filterDraft.from ?? ''}
          onChange={(e) => table.setFilter('from', e.target.value)}
          className="h-8 w-40 text-xs"
        />
        <span>—</span>
        <Input
          type="date"
          value={table.filterDraft.to ?? ''}
          onChange={(e) => table.setFilter('to', e.target.value)}
          className="h-8 w-40 text-xs"
        />
      </div>
    </div>
  );

  return (
    <DataTable<StockMovement>
      columns={columns}
      rows={movements.data?.items ?? []}
      total={movements.data?.total ?? 0}
      rowKey={(m) => m.id}
      page={table.page}
      pageSize={table.pageSize}
      onPageChange={table.setPage}
      onPageSizeChange={table.setPageSize}
      sortKey={table.sort}
      sortDir={table.sortDir}
      onSortChange={table.setSort}
      isLoading={movements.isLoading}
      isFetching={movements.isFetching}
      errorMessage={movements.isError ? getErrorMessage(movements.error) : null}
      emptyState={hasFilters ? 'Sin resultados con esos filtros.' : 'Sin movimientos.'}
      toolbar={toolbar}
    />
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-md border border-brand-from/60 bg-brand-from/10 px-2.5 py-1.5 text-xs font-medium text-foreground'
          : 'rounded-md border border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground'
      }
    >
      {label}
    </button>
  );
}

function dateInputToIso(value: string | undefined, bound: 'start' | 'end'): string | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  const date =
    bound === 'start'
      ? new Date(y, m - 1, d, 0, 0, 0, 0)
      : new Date(y, m - 1, d, 23, 59, 59, 999);
  return date.toISOString();
}
