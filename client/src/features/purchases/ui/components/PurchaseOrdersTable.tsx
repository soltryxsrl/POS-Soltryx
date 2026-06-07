'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, type ReactNode } from 'react';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Fab } from '@/shared/ui/controls/Fab';
import { FilterPopover } from '@/shared/ui/controls/FilterPopover';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { DataTable, useTableQueryState, type DataTableColumn } from '@/shared/ui/data-table';
import { useSuppliers } from '@/features/suppliers/application/hooks/use-suppliers';
import { usePurchaseOrders } from '../../application/hooks/use-purchases';
import type { PurchaseOrder, PurchaseOrderStatus } from '../../domain/types';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PARTIAL: 'bg-blue-100 text-blue-800',
  RECEIVED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-muted text-muted-foreground',
};

const STATUSES: PurchaseOrderStatus[] = ['PENDING', 'PARTIAL', 'RECEIVED', 'CANCELLED'];

const FILTER_KEYS = ['q', 'status', 'supplierId', 'from', 'to'] as const;

export function PurchaseOrdersTable({
  fillHeight,
  title,
}: {
  fillHeight?: boolean;
  title?: ReactNode;
}) {
  const router = useRouter();
  const table = useTableQueryState({
    defaultSort: 'createdAt',
    defaultSortDir: 'desc',
    filterKeys: FILTER_KEYS,
  });

  const orders = usePurchaseOrders({
    q: table.filters.q || undefined,
    status: (table.filters.status as PurchaseOrderStatus) || undefined,
    supplierId: table.filters.supplierId || undefined,
    from: dateInputToIso(table.filters.from, 'start'),
    to: dateInputToIso(table.filters.to, 'end'),
    sort: table.sort,
    sortDir: table.sortDir,
    limit: table.pageSize,
    offset: (table.page - 1) * table.pageSize,
  });

  const suppliers = useSuppliers({ isActive: 'true', limit: 200 });

  const columns = useMemo<DataTableColumn<PurchaseOrder>[]>(
    () => [
      {
        key: 'orderNumber',
        header: 'N°',
        sortable: true,
        render: (po) => <span className="font-mono text-xs">{po.orderNumber}</span>,
      },
      {
        key: 'supplier',
        header: 'Proveedor',
        render: (po) => po.supplierName,
      },
      {
        key: 'createdAt',
        header: 'Fecha',
        sortable: true,
        render: (po) => <span className="text-xs">{formatDateTime(po.createdAt)}</span>,
      },
      {
        key: 'lines',
        header: 'Líneas',
        align: 'right',
        render: (po) => po.items.length,
      },
      {
        key: 'total',
        header: 'Total',
        sortable: true,
        align: 'right',
        render: (po) => <span className="font-medium">{formatMoney(po.total)}</span>,
      },
      {
        key: 'status',
        header: 'Estado',
        render: (po) => (
          <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[po.status] ?? ''}`}>
            {STATUS_LABEL[po.status] ?? po.status}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (po) => (
          <Link
            href={`/purchases/${po.id}`}
            className="text-xs text-primary hover:underline"
          >
            Ver
          </Link>
        ),
      },
    ],
    [],
  );

  const hasFilters = FILTER_KEYS.some((k) => !!table.filters[k]);
  const activeCount = FILTER_KEYS.filter((k) => k !== 'q' && !!table.filters[k]).length;

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Buscar # de orden..."
        value={table.filterDraft.q ?? ''}
        onChange={(e) => table.setFilter('q', e.target.value)}
        className="w-56"
      />
      <FilterPopover activeCount={activeCount} onClear={() => table.clearFilters()}>
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">Estado</div>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <Chip
                key={s}
                label={STATUS_LABEL[s]}
                active={table.filterDraft.status === s}
                onClick={() =>
                  table.setFilter('status', table.filterDraft.status === s ? undefined : s)
                }
              />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">Proveedor</div>
          <Select
            value={table.filterDraft.supplierId ?? ''}
            onChange={(e) => table.setFilter('supplierId', e.target.value)}
            className="w-full"
          >
            <option value="">Todos los proveedores</option>
            {suppliers.data?.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.tradeName}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">Rango de fecha</div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={table.filterDraft.from ?? ''}
              onChange={(e) => table.setFilter('from', e.target.value)}
              className="h-8 min-w-0 flex-1 text-xs"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="date"
              value={table.filterDraft.to ?? ''}
              onChange={(e) => table.setFilter('to', e.target.value)}
              className="h-8 min-w-0 flex-1 text-xs"
            />
          </div>
        </div>
      </FilterPopover>
    </div>
  );

  return (
    <>
      <DataTable<PurchaseOrder>
        columns={columns}
        rows={orders.data?.items ?? []}
        total={orders.data?.total ?? 0}
        rowKey={(po) => po.id}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        sortKey={table.sort}
        sortDir={table.sortDir}
        onSortChange={table.setSort}
        isLoading={orders.isLoading}
        isFetching={orders.isFetching}
        errorMessage={orders.isError ? getErrorMessage(orders.error) : null}
        emptyState={
          hasFilters
            ? 'Sin resultados con esos filtros.'
            : 'Sin órdenes todavía. Crea la primera con "Nueva orden".'
        }
        title={title}
        toolbar={toolbar}
        fillHeight={fillHeight}
      />

      <Fab label="Nueva orden" onClick={() => router.push('/purchases/new')} />
    </>
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
