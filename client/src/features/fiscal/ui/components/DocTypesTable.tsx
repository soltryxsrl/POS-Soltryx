'use client';

import { useMemo, type ReactNode } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import {
  DataTable,
  useClientSort,
  type DataTableColumn,
} from '@/shared/ui/data-table';
import {
  useFiscalDocTypes,
  useToggleFiscalDocType,
} from '../../application/hooks/use-fiscal';
import type { FiscalDocType } from '../../domain/types';

const APPLIES_LABEL: Record<string, string> = {
  SALE: 'Ventas',
  PURCHASE: 'Compras',
  BOTH: 'Ambos',
};

export function DocTypesTable({
  fillHeight,
  title,
}: {
  fillHeight?: boolean;
  title?: ReactNode;
}) {
  const { user } = useAuth();
  const canManage = !!user && user.permissions.includes('fiscal.types.manage');
  const types = useFiscalDocTypes();
  const toggle = useToggleFiscalDocType();

  const sort = useClientSort<FiscalDocType>(types.data, 'code', 'asc');

  const columns = useMemo<DataTableColumn<FiscalDocType>[]>(
    () => [
      {
        key: 'code',
        header: 'Código',
        sortable: true,
        render: (t) => <span className="font-mono text-xs font-medium">{t.code}</span>,
      },
      {
        key: 'name',
        header: 'Nombre',
        sortable: true,
        render: (t) => (
          <>
            <div className="font-medium">{t.name}</div>
            {t.description && (
              <div className="text-[11px] text-muted-foreground">{t.description}</div>
            )}
          </>
        ),
      },
      {
        key: 'appliesTo',
        header: 'Aplica a',
        sortable: true,
        render: (t) => (
          <span className="text-xs">{APPLIES_LABEL[t.appliesTo] ?? t.appliesTo}</span>
        ),
      },
      {
        key: 'requiresBuyerRnc',
        header: 'Requiere RNC',
        render: (t) => (
          <span className="text-xs">
            {t.requiresBuyerRnc ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Sí
              </span>
            ) : (
              '—'
            )}
          </span>
        ),
      },
      {
        key: 'isActive',
        header: 'Activo',
        align: 'center',
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
    [canManage, toggle.isPending],
  );

  return (
    <DataTable<FiscalDocType>
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
      isLoading={types.isLoading}
      isFetching={types.isFetching}
      errorMessage={types.isError ? getErrorMessage(types.error) : null}
      emptyState="No hay tipos de comprobante."
      title={title}
      fillHeight={fillHeight}
    />
  );
}
