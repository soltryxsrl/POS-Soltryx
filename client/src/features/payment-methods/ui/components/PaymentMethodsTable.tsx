'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Star, XCircle } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import {
  DataTable,
  useClientSort,
  type DataTableColumn,
} from '@/shared/ui/data-table';
import {
  useSetDefaultPaymentMethod,
  useUpdatePaymentMethod,
  usePaymentMethods,
} from '../../application/hooks/use-payment-methods';
import type { PaymentMethodConfig } from '../../domain/types';

/** Etiqueta de la clase de comportamiento (no editable). */
const KIND_LABEL: Record<string, string> = {
  CASH: 'Efectivo (caja / vuelto)',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  ACCOUNT: 'Crédito (cuenta por cobrar)',
  OTHER: 'Otro',
};

export function PaymentMethodsTable() {
  const { user } = useAuth();
  const canManage =
    !!user && user.permissions.includes('payment-methods.manage');
  const methods = usePaymentMethods();
  const update = useUpdatePaymentMethod();
  const setDefault = useSetDefaultPaymentMethod();

  const sort = useClientSort<PaymentMethodConfig>(methods.data, 'sortOrder', 'asc');

  const columns = useMemo<DataTableColumn<PaymentMethodConfig>[]>(
    () => [
      {
        key: 'name',
        header: 'Nombre (visible en el POS)',
        render: (m) => (
          <NameCell
            key={m.code}
            value={m.name}
            disabled={!canManage || update.isPending}
            onSave={(name) => {
              if (name && name !== m.name) {
                update.mutate({ code: m.code, input: { name } });
              }
            }}
            isDefault={m.isDefault}
          />
        ),
      },
      {
        key: 'code',
        header: 'Comportamiento',
        sortable: true,
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
          <button
            type="button"
            onClick={() =>
              canManage &&
              update.mutate({
                code: m.code,
                input: { requiresReference: !m.requiresReference },
              })
            }
            disabled={!canManage || update.isPending}
            className={
              'rounded-full px-2 py-0.5 text-xs transition ' +
              (m.requiresReference
                ? 'bg-sky-100 text-sky-800 hover:bg-sky-200 dark:bg-sky-950/40 dark:text-sky-300'
                : 'bg-muted text-muted-foreground hover:bg-muted/80') +
              (!canManage ? ' cursor-default' : '')
            }
          >
            {m.requiresReference ? 'Sí' : 'No'}
          </button>
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
            <button
              type="button"
              onClick={() => canManage && setDefault.mutate(m.code)}
              disabled={!canManage || !m.isActive || setDefault.isPending}
              title={
                m.isActive
                  ? 'Preseleccionar al cobrar'
                  : 'Activa la forma de pago primero'
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
        render: (m) => (
          <button
            type="button"
            onClick={() =>
              canManage &&
              update.mutate({ code: m.code, input: { isActive: !m.isActive } })
            }
            disabled={!canManage || update.isPending}
            className={
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition ' +
              (m.isActive
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                : 'bg-muted text-muted-foreground hover:bg-muted/80') +
              (!canManage ? ' cursor-default' : '')
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
          </button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage, update.isPending, setDefault.isPending],
  );

  return (
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
      isLoading={methods.isLoading}
      isFetching={methods.isFetching}
      errorMessage={methods.isError ? getErrorMessage(methods.error) : null}
      emptyState="No hay formas de pago."
    />
  );
}

function NameCell({
  value,
  disabled,
  onSave,
  isDefault,
}: {
  value: string;
  disabled?: boolean;
  onSave: (name: string) => void;
  isDefault: boolean;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <div className="flex items-center gap-1.5">
      <input
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onSave(draft.trim())}
        maxLength={60}
        className="w-44 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-medium outline-none transition hover:border-border focus:border-brand-from/60 focus:bg-background focus:ring-1 focus:ring-brand-from/20 disabled:cursor-default"
      />
      {isDefault && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <Star className="h-2.5 w-2.5 fill-current" />
          Default
        </span>
      )}
    </div>
  );
}
