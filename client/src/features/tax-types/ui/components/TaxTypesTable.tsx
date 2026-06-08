'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Star, XCircle } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import {
  DataTable,
  useClientSort,
  type DataTableColumn,
} from '@/shared/ui/data-table';
import {
  useSetDefaultTaxType,
  useTaxTypes,
  useToggleTaxType,
} from '../../application/hooks/use-tax-types';
import type { TaxType } from '../../domain/types';

export function TaxTypesTable({
  fillHeight,
  title,
}: {
  fillHeight?: boolean;
  title?: ReactNode;
} = {}) {
  const { user } = useAuth();
  const canManage = !!user && user.permissions.includes('tax-types.manage');
  const [groupBy, setGroupBy] = useState<string | undefined>();
  const [groupDir, setGroupDir] = useState<'asc' | 'desc'>('asc');
  const types = useTaxTypes();
  const toggle = useToggleTaxType();
  const setDefault = useSetDefaultTaxType();

  const sort = useClientSort<TaxType>(types.data, 'sortOrder', 'asc');

  const columns = useMemo<DataTableColumn<TaxType>[]>(
    () => [
      {
        key: 'name',
        header: 'Tipo de ITBIS',
        sortable: true,
        grouping: {
          menuLabel: 'Exento',
          key: (t) => (t.isExempt ? 'exempt' : 'taxed'),
          label: (key) =>
            key === 'exempt' ? (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
                Exento
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                Gravado
              </span>
            ),
          sortValue: (key) => (key === 'exempt' ? 'Exento' : 'Gravado'),
        },
        render: (t) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium">{t.name}</span>
            {t.isDefault && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <Star className="h-2.5 w-2.5 fill-current" />
                Default
              </span>
            )}
            {t.isExempt && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
                Exento
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'rate',
        header: 'Tasa',
        align: 'right',
        sortable: true,
        render: (t) => (
          <span className="font-mono tabular-nums">
            {Number(t.rate).toFixed(2)}%
          </span>
        ),
      },
      {
        key: 'isDefault',
        header: 'Por defecto',
        align: 'center',
        render: (t) =>
          t.isDefault ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              <Star className="h-3.5 w-3.5 fill-amber-400" />
              Sí
            </span>
          ) : (
            <button
              type="button"
              onClick={() => canManage && setDefault.mutate(t.code)}
              disabled={!canManage || setDefault.isPending}
              title={
                canManage
                  ? 'Aplicar a productos nuevos por defecto'
                  : 'Requiere permiso para administrar'
              }
              className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition hover:border-amber-300 hover:text-amber-700 disabled:cursor-default disabled:opacity-50"
            >
              Marcar default
            </button>
          ),
      },
      {
        key: 'isActive',
        header: 'Activo',
        align: 'center',
        grouping: {
          key: (t) => (t.isActive ? 'active' : 'inactive'),
          label: (key) => (
            <span
              className={
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
                (key === 'active'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-muted text-muted-foreground')
              }
            >
              {key === 'active' ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Activo
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" />
                  Inactivo
                </>
              )}
            </span>
          ),
          sortValue: (key) => (key === 'active' ? 'Activo' : 'Inactivo'),
        },
        render: (t) => (
          <button
            type="button"
            onClick={() =>
              canManage && toggle.mutate({ code: t.code, isActive: !t.isActive })
            }
            disabled={!canManage || toggle.isPending}
            className={
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition ' +
              (t.isActive
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                : 'bg-muted text-muted-foreground hover:bg-muted/80') +
              (!canManage ? ' cursor-default' : '')
            }
          >
            {t.isActive ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Activo
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                Inactivo
              </>
            )}
          </button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage, toggle.isPending, setDefault.isPending],
  );

  return (
    <DataTable<TaxType>
      columns={columns}
      rows={sort.sorted}
      total={sort.sorted.length}
      rowKey={(t) => t.code}
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
      isLoading={types.isLoading}
      isFetching={types.isFetching}
      errorMessage={types.isError ? getErrorMessage(types.error) : null}
      emptyState="No hay tipos de ITBIS."
      title={title}
      fillHeight={fillHeight}
    />
  );
}
