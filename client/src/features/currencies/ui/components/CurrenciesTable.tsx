'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import {
  DataTable,
  useClientSort,
  type DataTableColumn,
} from '@/shared/ui/data-table';
import {
  useCurrencies,
  useToggleCurrency,
} from '../../application/hooks/use-currencies';
import type { Currency } from '../../domain/types';
import { SetRateDialog } from './SetRateDialog';

type CurrencyStatus = 'base' | 'active' | 'inactive';

const STATUS: Record<CurrencyStatus, { label: string; cls: string }> = {
  base: {
    label: 'Base',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  active: {
    label: 'Activa',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  inactive: {
    label: 'Inactiva',
    cls: 'bg-muted text-muted-foreground',
  },
};

const statusOf = (c: Currency): CurrencyStatus =>
  c.isBase ? 'base' : c.isActive ? 'active' : 'inactive';

function StatusBadge({ status }: { status: CurrencyStatus }) {
  const s = STATUS[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] ${s.cls}`}>{s.label}</span>
  );
}

export function CurrenciesTable({
  fillHeight,
  title,
}: {
  fillHeight?: boolean;
  title?: ReactNode;
} = {}) {
  const currencies = useCurrencies();
  const toggle = useToggleCurrency();
  const [editing, setEditing] = useState<Currency | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<string | undefined>();
  const [groupDir, setGroupDir] = useState<'asc' | 'desc'>('asc');

  const sort = useClientSort<Currency>(currencies.data, 'code', 'asc', (c, k) => {
    if (k === 'rate') return c.rateToBase ? Number(c.rateToBase) : null;
    if (k === 'rateUpdatedAt') return c.rateUpdatedAt;
    return (c as unknown as Record<string, unknown>)[k];
  });

  const onToggle = async (c: Currency) => {
    if (c.isBase) return;
    setActionError(null);
    try {
      await toggle.mutateAsync({
        code: c.code,
        input: { isActive: !c.isActive },
      });
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const columns = useMemo<DataTableColumn<Currency>[]>(
    () => [
      {
        key: 'code',
        header: 'Código',
        sortable: true,
        render: (c) => (
          <div className="flex items-center gap-2 font-medium">
            <span className="rounded bg-muted px-2 py-0.5 text-[11px] uppercase">{c.code}</span>
            <span className="text-muted-foreground">{c.symbol}</span>
          </div>
        ),
      },
      {
        key: 'name',
        header: 'Nombre',
        sortable: true,
        render: (c) => c.name,
      },
      {
        key: 'rate',
        header: 'Tasa actual',
        sortable: true,
        render: (c) => (
          <span className="text-xs">
            {c.isBase ? (
              <span className="text-muted-foreground">— (base)</span>
            ) : c.rateToBase ? (
              <>
                <strong>1 {c.code}</strong> = {Number(c.rateToBase).toFixed(2)} DOP
              </>
            ) : (
              <span className="text-amber-600">Sin tasa</span>
            )}
          </span>
        ),
      },
      {
        key: 'rateUpdatedAt',
        header: 'Actualizada',
        sortable: true,
        render: (c) => (
          <span className="text-xs text-muted-foreground">
            {c.rateUpdatedAt
              ? new Date(c.rateUpdatedAt).toLocaleString('es-DO', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Estado',
        grouping: {
          key: (c) => statusOf(c),
          label: (key) => <StatusBadge status={key as CurrencyStatus} />,
          sortValue: (key) => STATUS[key as CurrencyStatus]?.label ?? key,
        },
        render: (c) => <StatusBadge status={statusOf(c)} />,
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (c) => (
          <div className="flex justify-end gap-3">
            {!c.isBase && (
              <button
                type="button"
                onClick={() => setEditing(c)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
                Tasa
              </button>
            )}
            {!c.isBase && (
              <button
                type="button"
                onClick={() => onToggle(c)}
                disabled={toggle.isPending}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {c.isActive ? 'Desactivar' : 'Activar'}
              </button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toggle.isPending],
  );

  return (
    <div className={fillHeight ? 'flex min-h-0 flex-1 flex-col gap-3' : 'space-y-3'}>
      {actionError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {actionError}
        </p>
      )}

      <DataTable<Currency>
        columns={columns}
        rows={sort.sorted}
        total={sort.sorted.length}
        rowKey={(c) => c.code}
        page={1}
        pageSize={Math.max(sort.sorted.length, 25)}
        onPageChange={() => undefined}
        sortKey={sort.sortKey}
        sortDir={sort.sortDir}
        onSortChange={sort.onSortChange}
        groupBy={groupBy}
        groupDir={groupDir}
        onGroupByChange={setGroupBy}
        onGroupDirChange={setGroupDir}
        isLoading={currencies.isLoading}
        isFetching={currencies.isFetching}
        errorMessage={currencies.isError ? getErrorMessage(currencies.error) : null}
        emptyState="No hay monedas."
        title={title}
        fillHeight={fillHeight}
      />

      {editing && <SetRateDialog currency={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
