'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { X } from 'lucide-react';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
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

export function ReturnsTable() {
  const { user } = useAuth();
  const isPriv = !!user?.roles.includes('ADMIN') || !!user?.roles.includes('MANAGER');

  const table = useTableQueryState({
    defaultSort: 'createdAt',
    defaultSortDir: 'desc',
    filterKeys: FILTER_KEYS,
  });

  const returns = useReturns({
    q: table.filters.q || undefined,
    refundMethod: (table.filters.refundMethod as RefundMethod) || undefined,
    userId: table.filters.userId || undefined,
    from: dateInputToIso(table.filters.from, 'start'),
    to: dateInputToIso(table.filters.to, 'end'),
    sort: table.sort,
    sortDir: table.sortDir,
    limit: table.pageSize,
    offset: (table.page - 1) * table.pageSize,
  });

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
        render: (r) => <span className="font-medium">{formatMoney(r.total)}</span>,
      },
      {
        key: 'refundMethod',
        header: 'Reembolso',
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

  const toolbar = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar # de devolución..."
          value={table.filterDraft.q ?? ''}
          onChange={(e) => table.setFilter('q', e.target.value)}
          className="w-56"
        />
        <Select
          value={table.filterDraft.refundMethod ?? ''}
          onChange={(e) => table.setFilter('refundMethod', e.target.value)}
          className="w-40"
        >
          <option value="">Todos los métodos</option>
          {FILTERABLE_METHODS.map((m) => (
            <option key={m} value={m}>
              {REFUND_LABEL[m]}
            </option>
          ))}
        </Select>
        {isPriv && (
          <UserSelect
            value={table.filterDraft.userId ?? ''}
            onChange={(v) => table.setFilter('userId', v)}
          />
        )}
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
      isLoading={returns.isLoading}
      isFetching={returns.isFetching}
      errorMessage={returns.isError ? getErrorMessage(returns.error) : null}
      emptyState={hasFilters ? 'Sin resultados con esos filtros.' : 'Sin devoluciones todavía.'}
      toolbar={toolbar}
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
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="w-44">
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
