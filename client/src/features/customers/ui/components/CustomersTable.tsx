'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { dayKey, formatDateTime, formatDayLabel } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Fab } from '@/shared/ui/controls/Fab';
import { FilterPopover } from '@/shared/ui/controls/FilterPopover';
import { Input } from '@/shared/ui/controls/Input';
import { StatusFilter } from '@/shared/ui/controls/StatusFilter';
import { DataTable, useTableQueryState, type DataTableColumn } from '@/shared/ui/data-table';
import { useCustomers } from '../../application/hooks/use-customers';
import type { Customer } from '../../domain/types';
import { CustomerFormDialog } from './CustomerFormDialog';

const FILTER_KEYS = ['q', 'isActive'] as const;

// Al agrupar traemos el dataset completo (los grupos se arman en el cliente).
// Tope de seguridad: si hay más clientes que esto, se agrupan los primeros N
// y el pie de tabla avisa que el resultado quedó truncado.
const GROUP_FETCH_CAP = 2000;

const DOC_TYPE_LABEL: Record<string, string> = {
  CEDULA: 'Cédula',
  RNC: 'RNC',
  PASSPORT: 'Pasaporte',
  OTHER: 'Otro',
};

export function CustomersTable({
  fillHeight,
  title,
}: {
  fillHeight?: boolean;
  title?: ReactNode;
} = {}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const table = useTableQueryState({
    defaultSort: 'fullName',
    defaultSortDir: 'asc',
    filterKeys: FILTER_KEYS,
    defaultFilters: { isActive: 'true' },
  });

  // Con agrupación activa traemos el dataset completo (hasta el tope), que el
  // hook arma paginando del lado del cliente. Sin agrupar, paginación normal
  // del servidor.
  const grouping = !!table.groupBy;
  const customers = useCustomers(
    {
      q: table.filters.q || undefined,
      isActive: (table.filters.isActive as 'true' | 'false') || undefined,
      sort: table.sort,
      sortDir: table.sortDir,
      ...(grouping
        ? {}
        : { limit: table.pageSize, offset: (table.page - 1) * table.pageSize }),
    },
    { fetchAll: grouping, cap: GROUP_FETCH_CAP },
  );

  const columns = useMemo<DataTableColumn<Customer>[]>(
    () => [
      {
        key: 'fullName',
        header: 'Nombre',
        sortable: true,
        grouping: {
          menuLabel: 'Estado',
          key: (c) => (c.isActive ? 'true' : 'false'),
          label: (key) =>
            key === 'true' ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Activos
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Inactivos
              </span>
            ),
          sortValue: (key) => (key === 'true' ? 'Activos' : 'Inactivos'),
        },
        render: (c) => (
          <>
            <Link
              href={`/admin/customers/${c.id}`}
              className="font-medium text-primary hover:underline"
            >
              {c.fullName}
            </Link>
            {!c.isActive && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                Inactivo
              </span>
            )}
          </>
        ),
      },
      {
        key: 'document',
        header: 'Documento',
        sortable: true,
        grouping: {
          menuLabel: 'Tipo de documento',
          key: (c) => c.documentType ?? '',
          label: (key) =>
            key ? (
              DOC_TYPE_LABEL[key] ?? key
            ) : (
              <span className="text-muted-foreground">Sin tipo</span>
            ),
          sortValue: (key) => (key ? DOC_TYPE_LABEL[key] ?? key : 'Sin tipo'),
        },
        render: (c) => (
          <span className="text-xs text-muted-foreground">
            {c.document ?? '—'}
            {c.documentType && c.document && (
              <span className="ml-1 text-[10px] uppercase">({c.documentType})</span>
            )}
          </span>
        ),
      },
      {
        key: 'phone',
        header: 'Teléfono',
        render: (c) => <span className="text-xs">{c.phone ?? '—'}</span>,
      },
      {
        key: 'email',
        header: 'Email',
        sortable: true,
        render: (c) => <span className="text-xs">{c.email ?? '—'}</span>,
      },
      {
        key: 'createdAt',
        header: 'Creado',
        sortable: true,
        grouping: {
          menuLabel: 'Fecha',
          key: (c) => dayKey(c.createdAt),
          label: (key) => (key ? formatDayLabel(key) : 'Sin fecha'),
          sortValue: (key) => key, // 'YYYY-MM-DD' ⇒ orden cronológico
        },
        render: (c) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(c.createdAt)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (c) => (
          <button
            type="button"
            onClick={() => setEditing(c)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>
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
        placeholder="Buscar por nombre, documento, teléfono o email..."
        value={table.filterDraft.q ?? ''}
        onChange={(e) => table.setFilter('q', e.target.value)}
        className="w-80"
      />
      <FilterPopover activeCount={activeCount} onClear={() => table.clearFilters()}>
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">Estado</div>
          <StatusFilter
            value={table.filterDraft.isActive}
            onChange={(v) => table.setFilter('isActive', v)}
          />
        </div>
      </FilterPopover>
    </div>
  );

  return (
    <>
      <DataTable<Customer>
        columns={columns}
        rows={customers.data?.items ?? []}
        total={customers.data?.total ?? 0}
        rowKey={(c) => c.id}
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
        isLoading={customers.isLoading}
        isFetching={customers.isFetching}
        errorMessage={customers.isError ? getErrorMessage(customers.error) : null}
        emptyState={
          hasFilters ? 'Sin resultados con esos filtros.' : 'Sin clientes todavía.'
        }
        title={title}
        toolbar={toolbar}
        fillHeight={fillHeight}
      />

      {showCreate && <CustomerFormDialog onClose={() => setShowCreate(false)} />}
      {editing && (
        <CustomerFormDialog customer={editing} onClose={() => setEditing(null)} />
      )}

      <Fab label="Nuevo cliente" onClick={() => setShowCreate(true)} />
    </>
  );
}
