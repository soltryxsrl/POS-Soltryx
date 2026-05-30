'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus, X } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Input } from '@/shared/ui/controls/Input';
import { DataTable, useTableQueryState, type DataTableColumn } from '@/shared/ui/data-table';
import { useSuppliers } from '../../application/hooks/use-suppliers';
import type { Supplier } from '../../domain/types';
import { SupplierFormDialog } from './SupplierFormDialog';

const FILTER_KEYS = ['q', 'isActive'] as const;

export function SuppliersTable() {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const table = useTableQueryState({
    defaultSort: 'tradeName',
    defaultSortDir: 'asc',
    filterKeys: FILTER_KEYS,
  });

  const suppliers = useSuppliers({
    q: table.filters.q || undefined,
    isActive: (table.filters.isActive as 'true' | 'false') || undefined,
    sort: table.sort,
    sortDir: table.sortDir,
    limit: table.pageSize,
    offset: (table.page - 1) * table.pageSize,
  });

  const columns = useMemo<DataTableColumn<Supplier>[]>(
    () => [
      {
        key: 'tradeName',
        header: 'Nombre comercial',
        sortable: true,
        render: (s) => (
          <>
            <div className="font-medium">{s.tradeName}</div>
            {s.legalName && (
              <div className="text-[11px] text-muted-foreground">{s.legalName}</div>
            )}
            {!s.isActive && (
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                Inactivo
              </span>
            )}
          </>
        ),
      },
      {
        key: 'rnc',
        header: 'RNC',
        sortable: true,
        render: (s) => <span className="text-xs text-muted-foreground">{s.rnc ?? '—'}</span>,
      },
      {
        key: 'contact',
        header: 'Contacto',
        render: (s) => <span className="text-xs">{s.contactName ?? '—'}</span>,
      },
      {
        key: 'phone',
        header: 'Teléfono',
        render: (s) => <span className="text-xs">{s.phone ?? '—'}</span>,
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (s) => (
          <button
            type="button"
            onClick={() => setEditing(s)}
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
        placeholder="Buscar por nombre, RNC, contacto, teléfono..."
        value={table.filterDraft.q ?? ''}
        onChange={(e) => table.setFilter('q', e.target.value)}
        className="w-80"
      />
      <Chip
        label="Activos"
        active={table.filterDraft.isActive === 'true'}
        onClick={() =>
          table.setFilter(
            'isActive',
            table.filterDraft.isActive === 'true' ? undefined : 'true',
          )
        }
      />
      <Chip
        label="Inactivos"
        active={table.filterDraft.isActive === 'false'}
        onClick={() =>
          table.setFilter(
            'isActive',
            table.filterDraft.isActive === 'false' ? undefined : 'false',
          )
        }
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
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        Nuevo proveedor
      </button>
    </div>
  );

  return (
    <>
      <DataTable<Supplier>
        columns={columns}
        rows={suppliers.data?.items ?? []}
        total={suppliers.data?.total ?? 0}
        rowKey={(s) => s.id}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        sortKey={table.sort}
        sortDir={table.sortDir}
        onSortChange={table.setSort}
        isLoading={suppliers.isLoading}
        isFetching={suppliers.isFetching}
        errorMessage={suppliers.isError ? getErrorMessage(suppliers.error) : null}
        emptyState={
          hasFilters ? 'Sin resultados con esos filtros.' : 'Sin proveedores todavía.'
        }
        toolbar={toolbar}
      />

      {showCreate && <SupplierFormDialog onClose={() => setShowCreate(false)} />}
      {editing && (
        <SupplierFormDialog supplier={editing} onClose={() => setEditing(null)} />
      )}
    </>
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
