'use client';

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import { dayKey, formatDateTime, formatDayLabel, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { FilterPopover } from '@/shared/ui/controls/FilterPopover';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { DataTable, useTableQueryState, type DataTableColumn } from '@/shared/ui/data-table';
import { PaymentMethod, SaleStatus } from '@/shared/types/enums';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { useAdminUsers } from '@/features/admin/application/hooks/use-admin-users';
import { useSales } from '../../application/hooks/use-sales';
import type { Sale } from '../../domain/types';

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  REFUNDED: 'Devuelta',
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-muted text-muted-foreground',
  REFUNDED: 'bg-amber-100 text-amber-800',
};

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

const FILTER_KEYS = ['q', 'status', 'paymentMethod', 'userId', 'from', 'to'] as const;

// Al agrupar traemos el dataset completo (los grupos se arman en el cliente).
// Tope de seguridad: si hay más ventas que esto, se agrupan las primeras N
// y el pie de tabla avisa que el resultado quedó truncado.
const GROUP_FETCH_CAP = 2000;

export function SalesTable({
  fillHeight,
  title,
}: {
  fillHeight?: boolean;
  title?: ReactNode;
} = {}) {
  const { user } = useAuth();
  const canFilterByCashier =
    !!user?.roles.includes('ADMIN') || !!user?.roles.includes('MANAGER');

  const table = useTableQueryState({
    defaultSort: 'createdAt',
    defaultSortDir: 'desc',
    filterKeys: FILTER_KEYS,
  });

  // Con agrupación activa traemos el dataset completo (hasta el tope), que el
  // hook arma paginando del lado del cliente (el backend topa cada request en
  // 200). Sin agrupar, paginación normal del servidor.
  const grouping = !!table.groupBy;
  const sales = useSales(
    {
      q: table.filters.q || undefined,
      status: (table.filters.status as Sale['status']) || undefined,
      paymentMethod: (table.filters.paymentMethod as PaymentMethod) || undefined,
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

  const columns = useMemo<DataTableColumn<Sale>[]>(
    () => [
      {
        key: 'saleNumber',
        header: 'N°',
        sortable: true,
        render: (s) => <span className="font-mono text-xs">{s.saleNumber}</span>,
      },
      {
        key: 'createdAt',
        header: 'Fecha',
        sortable: true,
        grouping: {
          key: (s) => dayKey(s.createdAt),
          label: (key) => formatDayLabel(key),
          sortValue: (key) => key, // 'YYYY-MM-DD' ⇒ orden cronológico
        },
        render: (s) => <span className="text-xs">{formatDateTime(s.createdAt)}</span>,
      },
      {
        key: 'items',
        header: 'Items',
        align: 'right',
        aggregate: (rows) => {
          const sum = rows.reduce((acc, s) => acc + s.items.length, 0);
          return <span className="font-medium">{sum}</span>;
        },
        render: (s) => s.items.length,
      },
      {
        key: 'total',
        header: 'Total',
        sortable: true,
        align: 'right',
        aggregate: (rows) => {
          const sum = rows.reduce((acc, s) => acc + Number(s.total), 0);
          return <span className="font-medium">{formatMoney(sum)}</span>;
        },
        render: (s) => <span className="font-medium">{formatMoney(s.total)}</span>,
      },
      {
        key: 'status',
        header: 'Estado',
        grouping: {
          key: (s) => s.status,
          label: (key) => (
            <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[key] ?? ''}`}>
              {STATUS_LABEL[key] ?? key}
            </span>
          ),
          sortValue: (key) => STATUS_LABEL[key] ?? key,
        },
        render: (s) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[s.status] ?? ''}`}
          >
            {STATUS_LABEL[s.status] ?? s.status}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (s) => (
          <div className="flex items-center justify-end gap-3">
            <Link
              href={`/sales/${s.id}?print=1`}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Imprimir
            </Link>
            <Link
              href={`/sales/${s.id}`}
              className="text-xs text-primary hover:underline"
            >
              Ver
            </Link>
          </div>
        ),
      },
    ],
    [],
  );

  const activeChip = computeActiveDateChip(table.filters.from, table.filters.to);
  const hasFilters =
    !!table.filters.q ||
    !!table.filters.status ||
    !!table.filters.paymentMethod ||
    !!table.filters.userId ||
    !!table.filters.from ||
    !!table.filters.to;

  // Cuenta de filtros activos sin la búsqueda ('q' queda inline fuera del panel).
  const activeCount = FILTER_KEYS.filter((k) => k !== 'q' && !!table.filters[k]).length;

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Buscar # de venta..."
        value={table.filterDraft.q ?? ''}
        onChange={(e) => table.setFilter('q', e.target.value)}
        className="w-56"
      />
      <FilterPopover activeCount={activeCount} onClear={() => table.clearFilters()}>
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">Rango rápido</div>
          <div className="flex flex-wrap gap-2">
            <DateChip
              label="Hoy"
              active={activeChip === 'today'}
              onClick={() => applyDateRange(table.setFilters, 'today', table.filterDraft)}
            />
            <DateChip
              label="Ayer"
              active={activeChip === 'yesterday'}
              onClick={() => applyDateRange(table.setFilters, 'yesterday', table.filterDraft)}
            />
            <DateChip
              label="Semana"
              active={activeChip === 'week'}
              onClick={() => applyDateRange(table.setFilters, 'week', table.filterDraft)}
            />
            <DateChip
              label="Mes"
              active={activeChip === 'month'}
              onClick={() => applyDateRange(table.setFilters, 'month', table.filterDraft)}
            />
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">Estado</div>
          <Select
            value={table.filterDraft.status ?? ''}
            onChange={(e) => table.setFilter('status', e.target.value)}
            className="w-full"
          >
            <option value="">Todos los estados</option>
            <option value={SaleStatus.COMPLETED}>Completadas</option>
            <option value={SaleStatus.CANCELLED}>Canceladas</option>
            <option value={SaleStatus.REFUNDED}>Devueltas</option>
          </Select>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">Método de pago</div>
          <Select
            value={table.filterDraft.paymentMethod ?? ''}
            onChange={(e) => table.setFilter('paymentMethod', e.target.value)}
            className="w-full"
          >
            <option value="">Todos los pagos</option>
            <option value={PaymentMethod.CASH}>{PAYMENT_LABEL.CASH}</option>
            <option value={PaymentMethod.CARD}>{PAYMENT_LABEL.CARD}</option>
            <option value={PaymentMethod.TRANSFER}>{PAYMENT_LABEL.TRANSFER}</option>
            <option value={PaymentMethod.OTHER}>{PAYMENT_LABEL.OTHER}</option>
          </Select>
        </div>
        {canFilterByCashier && (
          <div>
            <div className="mb-1.5 text-xs font-medium text-foreground">Cajero</div>
            <CashierSelect
              value={table.filterDraft.userId ?? ''}
              onChange={(v) => table.setFilter('userId', v)}
            />
          </div>
        )}
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">Rango personalizado</div>
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
    <DataTable<Sale>
      columns={columns}
      rows={sales.data?.items ?? []}
      total={sales.data?.total ?? 0}
      rowKey={(s) => s.id}
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
      isLoading={sales.isLoading}
      isFetching={sales.isFetching}
      errorMessage={sales.isError ? getErrorMessage(sales.error) : null}
      emptyState={hasFilters ? 'Sin resultados con esos filtros.' : 'Sin ventas todavía.'}
      title={title}
      toolbar={toolbar}
      fillHeight={fillHeight}
    />
  );
}

function CashierSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const cashiers = useAdminUsers({ limit: 200 });
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full"
    >
      <option value="">Todos los cajeros</option>
      {cashiers.data?.items.map((u) => (
        <option key={u.id} value={u.id}>
          {u.fullName || u.username}
        </option>
      ))}
    </Select>
  );
}

function DateChip({
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

type DateChipKey = 'today' | 'yesterday' | 'week' | 'month';

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rangeFor(chip: DateChipKey): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  switch (chip) {
    case 'today':
      return { from: toDateInput(start), to: toDateInput(end) };
    case 'yesterday': {
      const yest = new Date(start);
      yest.setDate(yest.getDate() - 1);
      return { from: toDateInput(yest), to: toDateInput(yest) };
    }
    case 'week': {
      const weekStart = new Date(start);
      weekStart.setDate(weekStart.getDate() - 6);
      return { from: toDateInput(weekStart), to: toDateInput(end) };
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toDateInput(monthStart), to: toDateInput(end) };
    }
  }
}

function applyDateRange(
  setFilters: (next: Record<string, string>) => void,
  chip: DateChipKey,
  currentDraft: Record<string, string>,
) {
  const r = rangeFor(chip);
  // Mantiene otros filtros, reemplaza from/to.
  const next: Record<string, string> = { ...currentDraft };
  next.from = r.from;
  next.to = r.to;
  setFilters(next);
}

/**
 * Convierte `YYYY-MM-DD` (zona local) a ISO. `start` = 00:00:00 local,
 * `end` = 23:59:59.999 local. Devuelve undefined si no hay valor.
 */
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

function computeActiveDateChip(
  from: string | undefined,
  to: string | undefined,
): DateChipKey | null {
  if (!from || !to) return null;
  for (const chip of ['today', 'yesterday', 'week', 'month'] as const) {
    const r = rangeFor(chip);
    if (r.from === from && r.to === to) return chip;
  }
  return null;
}
