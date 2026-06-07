'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Lock, Pencil, Trash2 } from 'lucide-react';
import { Can } from '@/features/auth/ui/components/Can';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Fab } from '@/shared/ui/controls/Fab';
import { ConfirmDialog } from '@/shared/ui/feedback/ConfirmDialog';
import {
  DataTable,
  useClientSort,
  type DataTableColumn,
} from '@/shared/ui/data-table';
import {
  useAdminRoles,
  useRemoveAdminRole,
} from '../../application/hooks/use-admin-roles';
import type { AdminRole } from '../../domain/types';
import { RoleFormDialog } from './RoleFormDialog';

const SYSTEM_ROLE_CODES = new Set(['ADMIN']);

export function RolesTable({
  fillHeight,
  title,
}: {
  fillHeight?: boolean;
  title?: ReactNode;
} = {}) {
  const roles = useAdminRoles();
  const remove = useRemoveAdminRole();
  const [formState, setFormState] = useState<
    { mode: 'create' } | { mode: 'edit'; id: string } | null
  >(null);
  const [deleting, setDeleting] = useState<AdminRole | null>(null);
  const [delError, setDelError] = useState<string | null>(null);

  const sort = useClientSort<AdminRole>(roles.data, 'name', 'asc', (r, k) => {
    if (k === 'permissions') return r.permissions.length;
    if (k === 'userCount') return r.userCount ?? 0;
    return (r as unknown as Record<string, unknown>)[k];
  });

  const columns = useMemo<DataTableColumn<AdminRole>[]>(
    () => [
      {
        key: 'name',
        header: 'Nombre',
        sortable: true,
        render: (r) => {
          const isSystem = SYSTEM_ROLE_CODES.has(r.code);
          return (
            <div className="flex items-center gap-1.5 font-medium">
              <span>{r.name}</span>
              {isSystem && (
                <span title="Rol del sistema">
                  <Lock className="h-3 w-3 text-amber-500" />
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'description',
        header: 'Descripción',
        render: (r) => <span className="text-muted-foreground">{r.description ?? '—'}</span>,
      },
      {
        key: 'permissions',
        header: 'Permisos',
        sortable: true,
        align: 'right',
        render: (r) => (
          <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-medium text-brand-from">
            {r.permissions.length}
          </span>
        ),
      },
      {
        key: 'userCount',
        header: 'Usuarios',
        sortable: true,
        align: 'right',
        render: (r) => <span className="text-muted-foreground">{r.userCount ?? 0}</span>,
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (r) => {
          const isSystem = SYSTEM_ROLE_CODES.has(r.code);
          return (
            <div className="flex justify-end gap-1">
              <Can permission="roles.update">
                <button
                  type="button"
                  onClick={() => setFormState({ mode: 'edit', id: r.id })}
                  title="Editar"
                  className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </Can>
              <Can permission="roles.delete">
                <button
                  type="button"
                  onClick={() => {
                    setDelError(null);
                    setDeleting(r);
                  }}
                  disabled={isSystem || remove.isPending}
                  title={isSystem ? 'Rol del sistema (no eliminable)' : 'Eliminar'}
                  className="rounded-md p-1.5 text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Can>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [remove.isPending],
  );

  return (
    <>
      <DataTable<AdminRole>
        columns={columns}
        rows={sort.sorted}
        total={sort.sorted.length}
        rowKey={(r) => r.id}
        page={1}
        pageSize={Math.max(sort.sorted.length, 25)}
        onPageChange={() => undefined}
        sortKey={sort.sortKey}
        sortDir={sort.sortDir}
        onSortChange={sort.onSortChange}
        isLoading={roles.isLoading}
        isFetching={roles.isFetching}
        errorMessage={roles.isError ? getErrorMessage(roles.error) : null}
        emptyState="No hay roles."
        title={title}
        fillHeight={fillHeight}
      />

      {formState && (
        <RoleFormDialog
          roleId={formState.mode === 'edit' ? formState.id : null}
          onClose={() => setFormState(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Eliminar rol"
          message={
            <>
              ¿Eliminar el rol <strong>{deleting.name}</strong>? Esta acción no se
              puede deshacer.
            </>
          }
          confirmLabel="Eliminar"
          destructive
          pending={remove.isPending}
          error={delError}
          onConfirm={async () => {
            setDelError(null);
            try {
              await remove.mutateAsync(deleting.id);
              setDeleting(null);
            } catch (e) {
              setDelError(getErrorMessage(e));
            }
          }}
          onClose={() => setDeleting(null)}
        />
      )}

      <Can permission="roles.create">
        <Fab label="Nuevo rol" onClick={() => setFormState({ mode: 'create' })} />
      </Can>
    </>
  );
}
