'use client';

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import { dayKey, formatDateTime, formatDayLabel, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { FilterPopover } from '@/shared/ui/controls/FilterPopover';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { DataTable, useTableQueryState, type DataTableColumn } from '@/shared/ui/data-table';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { useAdminUsers } from '@/features/admin/application/hooks/use-admin-users';
import { useReturns } from '../../application/hooks/use-returns';
import type { RefundMethod, SaleReturn } from '../../domain/types';

const REFUND_LABEL: Record<RefundMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  STORE_CREDIT: 'Crédito',
  ACCOUNT: 'Cuenta',
  OTHER: 'Otro',
};

const REFUND_COLOR: Record<RefundMethod, string> = {
  CASH: 'bg-emerald-100 text-emerald-800',
  CARD: 'bg-blue-100 text-blue-800',
  TRANSFER: 'bg-indigo-100 text-indigo-800',
  STORE_CREDIT: 'bg-purple-100 text-purple-800',
  ACCOUNT: 'bg-amber-100 text-amber-800',
  OTHER: 'bg-muted text-muted-foreground',
};

// Métodos visibles en el filtro. Excluimos ACCOUNT por la preferencia no-crédito (legacy);
// la tabla todavía puede mostrar devoluciones legacy con ACCOUNT si existen.
const FILTERABLE_METHODS: RefundMethod[] = ['CASH', 'CARD', 'TRANSFER', 'STORE_CREDIT', 'OTHER'];

const FILTER_KEYS = ['q', 'refundMethod', 'userId', 'from', 'to'] as const;

// Al agrupar traemos el dataset completo (los grupos se arman en el cliente).
// Tope de seguridad: si hay más devoluciones que esto, se agrupan las primeras N
// y el pie de tabla avisa que el resultado quedó truncado.
const GROUP_FETCH_CAP = 2000;

export function ReturnsTable({
  fillHeight,
  title,
}: {
  fillHeight?: boolean;
  title?: ReactNode;
}) {
  const { user } = useAuth();
  const isPriv = !!user?.roles.includes('ADMIN') || !!user?.roles.includes('MANAGER');

  const table = useTableQueryState({
    defaultSort: 'createdAt',
    defaultSortDir: 'desc',
    filterKeys: FILTER_KEYS,
  });

  // Con agrupación activa traemos el dataset completo (hasta el tope), que el
  // hook arma paginando del lado del cliente (el backend topa cada request en
  // 200). Sin agrupar, paginación normal del servidor.
  const grouping = !!table.groupBy;
  const returns = useReturns(
    {
      q: table.filters.q || undefined,
      refundMethod: (table.filters.refundMethod as RefundMethod) || undefined,
      userId: table.filters.userId || undefined,
      from: dateInputToIso(table.filters.from, 'start'),
      to: dateInputToIso(table.filters.to, 'end'),
      sort: table.sort,
      sortDir: table.sortDir,
      ...(grouping
        ? {}
        : { limit: table.pageSize, offset: (table.page - 1) * table.pageSize }),
    },
    { fetchAll: grouping, cap: GROUP_FETCH_CAP },
  );

  const columns = useMemo<DataTableColumn<SaleReturn>[]>(
    () => [
      {
        key: 'returnNumber',
        header: 'N°',
        sortable: true,
        render: (r) => <span className="font-mono text-xs">{r.returnNumber}</span>,
      },
      {
        key: 'createdAt',
        header: 'Fecha',
        sortable: true,
        grouping: {
          key: (r) => dayKey(r.createdAt),
          label: (key) => formatDayLabel(key),
          sortValue: (key) => key, // 'YYYY-MM-DD' ⇒ orden cronológico
        },
        render: (r) => <span className="text-xs">{formatDateTime(r.createdAt)}</span>,
      },
      {
        key: 'sale',
        header: 'Venta',
        render: (r) =>
          r.saleNumber ? (
            <Link
              href={`/sales/${r.saleId}`}
              className="font-mono text-xs text-primary hover:underline"
            >
              {r.saleNumber}
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        key: 'items',
        header: 'Líneas',
        align: 'right',
        render: (r) => r.items.length,
      },
      {
        key: 'total',
        header: 'Total',
        sortable: true,
        align: 'right',
        aggregate: (rows) => {
          const sum = rows.reduce((acc, r) => acc + Number(r.total), 0);
          return formatMoney(sum);
        },
        render: (r) => <span className="font-medium">{formatMoney(r.total)}</span>,
      },
      {
        key: 'refundMethod',
        header: 'Reembolso',
        grouping: {
          key: (r) => r.refundMethod,
          label: (key) => (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${REFUND_COLOR[key as RefundMethod] ?? ''}`}
            >
              {REFUND_LABEL[key as RefundMethod] ?? key}
            </span>
          ),
          sortValue: (key) => REFUND_LABEL[key as RefundMethod] ?? key,
        },
        render: (r) => (
          <span className={`rounded-full px-2 py-0.5 text-xs ${REFUND_COLOR[r.refundMethod]}`}>
            {REFUND_LABEL[r.refundMethod] ?? r.refundMethod}
          </span>
        ),
      },
      {
        key: 'reason',
        header: 'Motivo',
        render: (r) => (
          <span className="line-clamp-1 text-xs text-muted-foreground">{r.reason ?? '—'}</span>
        ),
      },
    ],
    [],
  );

  const hasFilters = FILTER_KEYS.some((k) => !!table.filters[k]);
  // activeCount cuenta solo filtros no-búsqueda (excluye 'q', que va inline).
  const activeCount = FILTER_KEYS.filter((k) => k !== 'q' && !!table.filters[k]).length;

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Buscar # de devolución..."
        value={table.filterDraft.q ?? ''}
        onChange={(e) => table.setFilter('q', e.target.value)}
        className="w-56"
      />
      <FilterPopover activeCount={activeCount} onClear={() => table.clearFilters()}>
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">Método de reembolso</div>
          <Select
            value={table.filterDraft.refundMethod ?? ''}
            onChange={(e) => table.setFilter('refundMethod', e.target.value)}
            className="w-full"
          >
            <option value="">Todos los métodos</option>
            {FILTERABLE_METHODS.map((m) => (
              <option key={m} value={m}>
                {REFUND_LABEL[m]}
              </option>
            ))}
          </Select>
        </div>
        {isPriv && (
          <div>
            <div className="mb-1.5 text-xs font-medium text-foreground">Usuario</div>
            <UserSelect
              value={table.filterDraft.userId ?? ''}
              onChange={(v) => table.setFilter('userId', v)}
            />
          </div>
        )}
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
    <DataTable<SaleReturn>
      columns={columns}
      rows={returns.data?.items ?? []}
      total={returns.data?.total ?? 0}
      rowKey={(r) => r.id}
      page={table.page}
      pageSize={table.pageSize}
      onPageChange={table.setPage}
      onPageSizeChange={table.setPageSize}
      sortKey={table.sort}
      sortDir={table.sortDir}
      onSortChange={table.setSort}
      groupBy={table.groupBy}
      groupDir={table.groupDir}
      onGroupByChange={table.setGroupBy}
      onGroupDirChange={table.setGroupDir}
      isLoading={returns.isLoading}
      isFetching={returns.isFetching}
      errorMessage={returns.isError ? getErrorMessage(returns.error) : null}
      emptyState={hasFilters ? 'Sin resultados con esos filtros.' : 'Sin devoluciones todavía.'}
      title={title}
      toolbar={toolbar}
      fillHeight={fillHeight}
    />
  );
}

function UserSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const users = useAdminUsers({ limit: 200 });
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="w-full">
      <option value="">Todos los usuarios</option>
      {users.data?.items.map((u) => (
        <option key={u.id} value={u.id}>
          {u.fullName || u.username}
        </option>
      ))}
    </Select>
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
