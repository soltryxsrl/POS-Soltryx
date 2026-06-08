'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { dayKey, formatDateTime, formatDayLabel, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { FilterPopover } from '@/shared/ui/controls/FilterPopover';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { DataTable, useTableQueryState, type DataTableColumn } from '@/shared/ui/data-table';
import { CashSessionStatus } from '@/shared/types/enums';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { useAdminUsers } from '@/features/admin/application/hooks/use-admin-users';
import { useCashRegisters, useCashSessions } from '../../application/hooks/use-cash';
import type { CashSession } from '../../domain/types';
import { SessionReportDialog } from './SessionReportDialog';

const FILTER_KEYS = ['status', 'cashRegisterId', 'openedById', 'from', 'to'] as const;

// Al agrupar traemos el dataset completo (los grupos se arman en el cliente).
// Tope de seguridad: si hay más sesiones que esto, se agrupan las primeras N
// y el pie de tabla avisa que el resultado quedó truncado.
const GROUP_FETCH_CAP = 2000;

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Abierta',
  CLOSED: 'Cerrada',
};

export function SessionsTable({
  fillHeight,
  title,
}: {
  fillHeight?: boolean;
  title?: ReactNode;
} = {}) {
  const { user } = useAuth();
  const isPriv =
    !!user?.roles.includes('ADMIN') || !!user?.roles.includes('MANAGER');

  const table = useTableQueryState({
    defaultSort: 'openedAt',
    defaultSortDir: 'desc',
    filterKeys: FILTER_KEYS,
  });

  // Con agrupación activa traemos el dataset completo (hasta el tope), que el
  // hook arma paginando del lado del cliente (el backend topa cada request).
  // Sin agrupar, paginación normal del servidor.
  const grouping = !!table.groupBy;
  const sessions = useCashSessions(
    {
      status: (table.filters.status as CashSessionStatus) || undefined,
      cashRegisterId: table.filters.cashRegisterId || undefined,
      openedById: table.filters.openedById || undefined,
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

  const registers = useCashRegisters();
  const [reportId, setReportId] = useState<string | null>(null);

  const columns = useMemo<DataTableColumn<CashSession>[]>(
    () => [
      {
        key: 'openedAt',
        header: 'Abierta',
        sortable: true,
        grouping: {
          key: (s) => dayKey(s.openedAt),
          label: (key) => formatDayLabel(key),
          sortValue: (key) => key, // 'YYYY-MM-DD' ⇒ orden cronológico
        },
        render: (s) => <span className="text-xs">{formatDateTime(s.openedAt)}</span>,
      },
      {
        key: 'closedAt',
        header: 'Cerrada',
        sortable: true,
        render: (s) => (
          <span className="text-xs text-muted-foreground">
            {s.closedAt ? formatDateTime(s.closedAt) : '—'}
          </span>
        ),
      },
      {
        key: 'opening',
        header: 'Inicial',
        align: 'right',
        aggregate: (rows) =>
          formatMoney(rows.reduce((acc, s) => acc + Number(s.openingAmount), 0)),
        render: (s) => formatMoney(s.openingAmount),
      },
      {
        key: 'expectedAmount',
        header: 'Esperado',
        sortable: true,
        align: 'right',
        aggregate: (rows) =>
          formatMoney(
            rows.reduce((acc, s) => acc + (s.expectedAmount ? Number(s.expectedAmount) : 0), 0),
          ),
        render: (s) => (s.expectedAmount ? formatMoney(s.expectedAmount) : '—'),
      },
      {
        key: 'counted',
        header: 'Contado',
        align: 'right',
        aggregate: (rows) =>
          formatMoney(
            rows.reduce((acc, s) => acc + (s.countedAmount ? Number(s.countedAmount) : 0), 0),
          ),
        render: (s) => (s.countedAmount ? formatMoney(s.countedAmount) : '—'),
      },
      {
        key: 'difference',
        header: 'Diferencia',
        align: 'right',
        aggregate: (rows) => {
          // Suma de las diferencias del grupo, con el mismo código de color que
          // la celda: 0 verde, sobrante (>0) ámbar, faltante (<0) destructivo.
          const sum = rows.reduce(
            (acc, s) => acc + (s.difference ? parseFloat(s.difference) : 0),
            0,
          );
          const cls =
            sum === 0 ? 'text-green-700' : sum > 0 ? 'text-amber-700' : 'text-destructive';
          return (
            <span className={`font-medium ${cls}`}>
              {sum > 0 ? '+' : ''}
              {formatMoney(String(sum))}
            </span>
          );
        },
        render: (s) => {
          const diffNum = s.difference ? parseFloat(s.difference) : null;
          if (diffNum === null) return '—';
          const cls =
            diffNum === 0
              ? 'text-green-700'
              : diffNum > 0
                ? 'text-amber-700'
                : 'text-destructive';
          return (
            <span className={`font-medium ${cls}`}>
              {diffNum > 0 ? '+' : ''}
              {formatMoney(s.difference!)}
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Estado',
        grouping: {
          key: (s) => s.status,
          label: (key) => (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                key === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
              }`}
            >
              {STATUS_LABEL[key] ?? key}
            </span>
          ),
          sortValue: (key) => STATUS_LABEL[key] ?? key,
        },
        render: (s) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              s.status === 'OPEN'
                ? 'bg-green-100 text-green-800'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {s.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
          </span>
        ),
      },
      {
        key: 'report',
        header: 'Reporte',
        align: 'right',
        render: (s) => (
          <button
            type="button"
            onClick={() => setReportId(s.id)}
            className="text-xs text-primary hover:underline"
          >
            {s.status === 'OPEN' ? 'X' : 'Z'}
          </button>
        ),
      },
    ],
    [],
  );

  const hasFilters = FILTER_KEYS.some((k) => !!table.filters[k]);
  const activeCount = FILTER_KEYS.filter((k) => !!table.filters[k]).length;
  const activeChip = computeActiveDateChip(table.filters.from, table.filters.to);

  const toolbar = (
    <div className="flex justify-end">
      <FilterPopover activeCount={activeCount} onClear={() => table.clearFilters()}>
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">Estado</div>
          <div className="flex flex-wrap gap-2">
            <Chip
              label="Abierta"
              active={table.filterDraft.status === 'OPEN'}
              onClick={() =>
                table.setFilter('status', table.filterDraft.status === 'OPEN' ? undefined : 'OPEN')
              }
            />
            <Chip
              label="Cerrada"
              active={table.filterDraft.status === 'CLOSED'}
              onClick={() =>
                table.setFilter('status', table.filterDraft.status === 'CLOSED' ? undefined : 'CLOSED')
              }
            />
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">Rango rápido</div>
          <div className="flex flex-wrap gap-2">
            <DateChip
              label="Hoy"
              active={activeChip === 'today'}
              onClick={() => applyDateRange(table.setFilters, 'today', table.filterDraft)}
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
          <div className="mb-1.5 text-xs font-medium text-foreground">Caja</div>
          <Select
            value={table.filterDraft.cashRegisterId ?? ''}
            onChange={(e) => table.setFilter('cashRegisterId', e.target.value)}
            className="w-full"
          >
            <option value="">Todas las cajas</option>
            {registers.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
        {isPriv && (
          <div>
            <div className="mb-1.5 text-xs font-medium text-foreground">Usuario</div>
            <UserSelect
              value={table.filterDraft.openedById ?? ''}
              onChange={(v) => table.setFilter('openedById', v)}
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
    <>
      <DataTable<CashSession>
        columns={columns}
        rows={sessions.data?.items ?? []}
        total={sessions.data?.total ?? 0}
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
        isLoading={sessions.isLoading}
        isFetching={sessions.isFetching}
        errorMessage={sessions.isError ? getErrorMessage(sessions.error) : null}
        emptyState={hasFilters ? 'Sin resultados con esos filtros.' : 'Sin sesiones todavía.'}
        title={title}
        toolbar={toolbar}
        fillHeight={fillHeight}
      />

      {reportId && (
        <SessionReportDialog sessionId={reportId} onClose={() => setReportId(null)} />
      )}
    </>
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
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full"
    >
      <option value="">Todos los usuarios</option>
      {users.data?.items.map((u) => (
        <option key={u.id} value={u.id}>
          {u.fullName || u.username}
        </option>
      ))}
    </Select>
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

type DateChipKey = 'today' | 'week' | 'month';

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
  const next: Record<string, string> = { ...currentDraft };
  next.from = r.from;
  next.to = r.to;
  setFilters(next);
}

function computeActiveDateChip(
  from: string | undefined,
  to: string | undefined,
): DateChipKey | null {
  if (!from || !to) return null;
  for (const chip of ['today', 'week', 'month'] as const) {
    const r = rangeFor(chip);
    if (r.from === from && r.to === to) return chip;
  }
  return null;
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
