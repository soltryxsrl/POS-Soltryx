'use client';

import { useMemo, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { Can } from '@/features/auth/ui/components/Can';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Fab } from '@/shared/ui/controls/Fab';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { StatusFilter } from '@/shared/ui/controls/StatusFilter';
import { DataTable, useTableQueryState, type DataTableColumn } from '@/shared/ui/data-table';
import { useAdminRoles } from '../../application/hooks/use-admin-roles';
import {
  useAdminUsers,
  useRemoveAdminUser,
} from '../../application/hooks/use-admin-users';
import type { AdminUser } from '../../domain/types';
import { UserFormDialog } from './UserFormDialog';

const FILTER_KEYS = ['q', 'isActive', 'roleId'] as const;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return '—';
  }
}

export function UsersTable() {
  const table = useTableQueryState({
    defaultSort: 'username',
    defaultSortDir: 'asc',
    filterKeys: FILTER_KEYS,
  });

  const users = useAdminUsers({
    q: table.filters.q || undefined,
    isActive: parseBool(table.filters.isActive),
    roleId: table.filters.roleId || undefined,
    sort: table.sort,
    sortDir: table.sortDir,
    limit: table.pageSize,
    offset: (table.page - 1) * table.pageSize,
  });

  const remove = useRemoveAdminUser();
  const roles = useAdminRoles();
  const [formState, setFormState] = useState<
    { mode: 'create' } | { mode: 'edit'; id: string } | null
  >(null);

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el usuario "${name}"?`)) return;
    try {
      await remove.mutateAsync(id);
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  const columns = useMemo<DataTableColumn<AdminUser>[]>(
    () => [
      {
        key: 'fullName',
        header: 'Nombre',
        sortable: true,
        render: (u) => <span className="font-medium">{u.fullName}</span>,
      },
      {
        key: 'email',
        header: 'Email',
        sortable: true,
        render: (u) => <span className="text-muted-foreground">{u.email}</span>,
      },
      {
        key: 'username',
        header: 'Username',
        sortable: true,
        render: (u) => <span className="text-muted-foreground">{u.username}</span>,
      },
      {
        key: 'roles',
        header: 'Roles',
        render: (u) => (
          <div className="flex flex-wrap gap-1">
            {u.roles.length === 0 ? (
              <span className="text-xs text-muted-foreground">Sin roles</span>
            ) : (
              u.roles.map((r) => (
                <span
                  key={r.id}
                  className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"
                >
                  {r.name}
                </span>
              ))
            )}
          </div>
        ),
      },
      {
        key: 'isActive',
        header: 'Estado',
        render: (u) => (
          <span
            className={
              u.isActive
                ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700'
                : 'rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600'
            }
          >
            {u.isActive ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
      {
        key: 'lastLoginAt',
        header: 'Último login',
        render: (u) => (
          <span className="text-muted-foreground">{formatDate(u.lastLoginAt)}</span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (u) => (
          <div className="flex justify-end gap-1">
            <Can permission="users.update">
              <button
                type="button"
                onClick={() => setFormState({ mode: 'edit', id: u.id })}
                title="Editar"
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </Can>
            <Can permission="users.delete">
              <button
                type="button"
                onClick={() => handleRemove(u.id, u.fullName)}
                title="Eliminar"
                disabled={remove.isPending}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Can>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [remove.isPending],
  );

  const hasFilters = FILTER_KEYS.some((k) => !!table.filters[k]);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Buscar por email, username o nombre..."
        value={table.filterDraft.q ?? ''}
        onChange={(e) => table.setFilter('q', e.target.value)}
        className="w-80"
      />
      <StatusFilter
        value={table.filterDraft.isActive}
        onChange={(v) => table.setFilter('isActive', v)}
      />
      <Select
        value={table.filterDraft.roleId ?? ''}
        onChange={(e) => table.setFilter('roleId', e.target.value)}
        className="w-44"
      >
        <option value="">Todos los roles</option>
        {roles.data?.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </Select>
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
      <DataTable<AdminUser>
        columns={columns}
        rows={users.data?.items ?? []}
        total={users.data?.total ?? 0}
        rowKey={(u) => u.id}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        sortKey={table.sort}
        sortDir={table.sortDir}
        onSortChange={table.setSort}
        isLoading={users.isLoading}
        isFetching={users.isFetching}
        errorMessage={users.isError ? getErrorMessage(users.error) : null}
        emptyState={hasFilters ? 'Sin resultados con esos filtros.' : 'No hay usuarios.'}
        toolbar={toolbar}
      />

      {formState && (
        <UserFormDialog
          userId={formState.mode === 'edit' ? formState.id : null}
          onClose={() => setFormState(null)}
        />
      )}

      <Can permission="users.create">
        <Fab label="Nuevo usuario" onClick={() => setFormState({ mode: 'create' })} />
      </Can>
    </>
  );
}

function parseBool(v: string | undefined): boolean | undefined {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}
