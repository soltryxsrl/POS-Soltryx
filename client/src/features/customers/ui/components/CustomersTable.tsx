'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Pencil, X } from 'lucide-react';
import { formatDateTime } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Fab } from '@/shared/ui/controls/Fab';
import { Input } from '@/shared/ui/controls/Input';
import { StatusFilter } from '@/shared/ui/controls/StatusFilter';
import { DataTable, useTableQueryState, type DataTableColumn } from '@/shared/ui/data-table';
import { useCustomers } from '../../application/hooks/use-customers';
import type { Customer } from '../../domain/types';
import { CustomerFormDialog } from './CustomerFormDialog';

const FILTER_KEYS = ['q', 'isActive'] as const;

export function CustomersTable() {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const table = useTableQueryState({
    defaultSort: 'fullName',
    defaultSortDir: 'asc',
    filterKeys: FILTER_KEYS,
  });

  const customers = useCustomers({
    q: table.filters.q || undefined,
    isActive: (table.filters.isActive as 'true' | 'false') || undefined,
    sort: table.sort,
    sortDir: table.sortDir,
    limit: table.pageSize,
    offset: (table.page - 1) * table.pageSize,
  });

  const columns = useMemo<DataTableColumn<Customer>[]>(
    () => [
      {
        key: 'fullName',
        header: 'Nombre',
        sortable: true,
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

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Buscar por nombre, documento, teléfono o email..."
        value={table.filterDraft.q ?? ''}
        onChange={(e) => table.setFilter('q', e.target.value)}
        className="w-80"
      />
      <StatusFilter
        value={table.filterDraft.isActive}
        onChange={(v) => table.setFilter('isActive', v)}
      />
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
        isLoading={customers.isLoading}
        isFetching={customers.isFetching}
        errorMessage={customers.isError ? getErrorMessage(customers.error) : null}
        emptyState={
          hasFilters ? 'Sin resultados con esos filtros.' : 'Sin clientes todavía.'
        }
        toolbar={toolbar}
      />

      {showCreate && <CustomerFormDialog onClose={() => setShowCreate(false)} />}
      {editing && (
        <CustomerFormDialog customer={editing} onClose={() => setEditing(null)} />
      )}

      <Fab label="Nuevo cliente" onClick={() => setShowCreate(true)} />
    </>
  );
}
