'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Pencil, Star, XCircle } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import {
  DataTable,
  useClientSort,
  type DataTableColumn,
} from '@/shared/ui/data-table';
import { usePaymentMethods } from '../../application/hooks/use-payment-methods';
import type { PaymentMethodConfig } from '../../domain/types';
import { PaymentMethodFormDialog } from './PaymentMethodFormDialog';

/** Etiqueta de la clase de comportamiento (no editable). */
const KIND_LABEL: Record<string, string> = {
  CASH: 'Efectivo (caja / vuelto)',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  ACCOUNT: 'Crédito (cuenta por cobrar)',
  OTHER: 'Otro',
};

export function PaymentMethodsTable({
  fillHeight,
  title,
}: {
  fillHeight?: boolean;
  title?: ReactNode;
} = {}) {
  const { user } = useAuth();
  const canManage =
    !!user && user.permissions.includes('payment-methods.manage');
  const methods = usePaymentMethods();
  const [editing, setEditing] = useState<PaymentMethodConfig | null>(null);
  const [groupBy, setGroupBy] = useState<string | undefined>();
  const [groupDir, setGroupDir] = useState<'asc' | 'desc'>('asc');

  const sort = useClientSort<PaymentMethodConfig>(methods.data, 'sortOrder', 'asc');

  const columns = useMemo<DataTableColumn<PaymentMethodConfig>[]>(
    () => [
      {
        key: 'name',
        header: 'Nombre',
        render: (m) => (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{m.name}</span>
            {m.isDefault && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <Star className="h-2.5 w-2.5 fill-current" />
                Default
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'code',
        header: 'Comportamiento',
        sortable: true,
        grouping: {
          key: (m) => m.code,
          label: (key) => (
            <span className="text-xs font-semibold">
              {KIND_LABEL[key] ?? key}
            </span>
          ),
          sortValue: (key) => KIND_LABEL[key] ?? key,
        },
        render: (m) => (
          <span className="text-xs text-muted-foreground">
            {KIND_LABEL[m.code] ?? m.code}
          </span>
        ),
      },
      {
        key: 'requiresReference',
        header: 'Pide referencia',
        align: 'center',
        render: (m) => (
          <span
            className={
              'rounded-full px-2 py-0.5 text-xs ' +
              (m.requiresReference
                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300'
                : 'bg-muted text-muted-foreground')
            }
          >
            {m.requiresReference ? 'Sí' : 'No'}
          </span>
        ),
      },
      {
        key: 'isDefault',
        header: 'Por defecto',
        align: 'center',
        render: (m) =>
          m.isDefault ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              <Star className="h-3.5 w-3.5 fill-amber-400" />
              Sí
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        key: 'isActive',
        header: 'Activo',
        align: 'center',
        grouping: {
          key: (m) => (m.isActive ? 'active' : 'inactive'),
          label: (key) => (
            <span
              className={
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ' +
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
        render: (m) => (
          <span
            className={
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ' +
              (m.isActive
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-muted text-muted-foreground')
            }
          >
            {m.isActive ? (
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
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (m) =>
          canManage ? (
            <button
              type="button"
              onClick={() => setEditing(m)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
          ) : null,
      },
    ],
    [canManage],
  );

  return (
    <>
      <DataTable<PaymentMethodConfig>
        columns={columns}
        rows={sort.sorted}
        total={sort.sorted.length}
        rowKey={(m) => m.code}
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
        isLoading={methods.isLoading}
        isFetching={methods.isFetching}
        errorMessage={methods.isError ? getErrorMessage(methods.error) : null}
        emptyState="No hay formas de pago."
        title={title}
        fillHeight={fillHeight}
      />

      {editing && (
        <PaymentMethodFormDialog
          method={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
