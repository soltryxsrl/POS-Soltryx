'use client';

import { useMemo, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { Fab } from '@/shared/ui/controls/Fab';
import { Input } from '@/shared/ui/controls/Input';
import { StatusFilter } from '@/shared/ui/controls/StatusFilter';
import { ConfirmDialog } from '@/shared/ui/feedback/ConfirmDialog';
import { DataTable, useClientSort, type DataTableColumn } from '@/shared/ui/data-table';
import { useCategories, useDeleteCategory } from '../../application/hooks/use-categories';
import type { Category } from '../../domain/types';
import { CategoryFormDialog } from './CategoryFormDialog';

export function CategoriesTable() {
  const canCreate = useHasPermission('categories.create');
  const canUpdate = useHasPermission('categories.update');
  const canDelete = useHasPermission('categories.delete');

  const categories = useCategories();
  const del = useDeleteCategory();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [delError, setDelError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);

  const all = useMemo(() => categories.data ?? [], [categories.data]);
  const nameById = useMemo(() => new Map(all.map((c) => [c.id, c.name])), [all]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((c) => {
      if (status === 'true' && !c.isActive) return false;
      if (status === 'false' && c.isActive) return false;
      if (needle && !`${c.name} ${c.description ?? ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [all, q, status]);

  const sort = useClientSort<Category>(filtered, 'name', 'asc');

  const columns = useMemo<DataTableColumn<Category>[]>(
    () => [
      {
        key: 'name',
        header: 'Nombre',
        sortable: true,
        render: (c) => (
          <>
            <div className="font-medium">{c.name}</div>
            {c.description && (
              <div className="text-[11px] text-muted-foreground">{c.description}</div>
            )}
          </>
        ),
      },
      {
        key: 'parentId',
        header: 'Categoría padre',
        render: (c) => (
          <span className="text-xs text-muted-foreground">
            {c.parentId ? (nameById.get(c.parentId) ?? '—') : '—'}
          </span>
        ),
      },
      {
        key: 'isActive',
        header: 'Estado',
        align: 'center',
        render: (c) =>
          c.isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
              Activa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Inactiva
            </span>
          ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (c) => (
          <div className="flex items-center justify-end gap-0.5">
            {canUpdate && (
              <button
                type="button"
                title="Editar"
                aria-label="Editar"
                onClick={() => setEditing(c)}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                title="Eliminar"
                aria-label="Eliminar"
                onClick={() => {
                  setDelError(null);
                  setDeleting(c);
                }}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [canUpdate, canDelete, nameById],
  );

  const hasFilters = !!q || !!status;

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Buscar por nombre o descripción..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-80"
      />
      <StatusFilter value={status} onChange={(v) => setStatus(v)} />
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setQ('');
            setStatus(undefined);
          }}
          className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3 w-3" /> Limpiar
        </button>
      )}
    </div>
  );

  return (
    <>
      <DataTable<Category>
        columns={columns}
        rows={sort.sorted}
        total={sort.sorted.length}
        rowKey={(c) => c.id}
        page={1}
        pageSize={Math.max(sort.sorted.length, 25)}
        onPageChange={() => undefined}
        sortKey={sort.sortKey}
        sortDir={sort.sortDir}
        onSortChange={sort.onSortChange}
        isLoading={categories.isLoading}
        isFetching={categories.isFetching}
        errorMessage={categories.isError ? getErrorMessage(categories.error) : null}
        emptyState={
          hasFilters
            ? 'Sin resultados con esos filtros.'
            : 'Sin categorías todavía. Crea la primera con "Nueva categoría".'
        }
        toolbar={toolbar}
      />

      {showCreate && (
        <CategoryFormDialog categories={all} onClose={() => setShowCreate(false)} />
      )}
      {editing && (
        <CategoryFormDialog
          category={editing}
          categories={all}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Eliminar categoría"
          message={
            <>
              ¿Eliminar <strong>{deleting.name}</strong>? Los productos asociados no se
              borran, pero quedarán sin categoría.
            </>
          }
          confirmLabel="Eliminar"
          destructive
          pending={del.isPending}
          error={delError}
          onConfirm={async () => {
            setDelError(null);
            try {
              await del.mutateAsync(deleting.id);
              setDeleting(null);
            } catch (e) {
              setDelError(getErrorMessage(e));
            }
          }}
          onClose={() => setDeleting(null)}
        />
      )}

      {canCreate && <Fab label="Nueva categoría" onClick={() => setShowCreate(true)} />}
    </>
  );
}
