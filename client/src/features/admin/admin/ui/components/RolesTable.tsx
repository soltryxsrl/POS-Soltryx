'use client';

import { useState } from 'react';
import { Lock, Pencil, Trash2 } from 'lucide-react';
import { Can } from '@/features/auth/ui/components/Can';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Fab } from '@/shared/ui/controls/Fab';
import {
  useAdminRoles,
  useRemoveAdminRole,
} from '../../application/hooks/use-admin-roles';
import { RoleFormDialog } from './RoleFormDialog';

const SYSTEM_ROLE_CODES = new Set(['ADMIN']);

export function RolesTable() {
  const roles = useAdminRoles();
  const remove = useRemoveAdminRole();
  const [formState, setFormState] = useState<
    { mode: 'create' } | { mode: 'edit'; id: string } | null
  >(null);

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el rol "${name}"?`)) return;
    try {
      await remove.mutateAsync(id);
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Descripción</th>
              <th className="px-4 py-2 text-right">Permisos</th>
              <th className="px-4 py-2 text-right">Usuarios</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {roles.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            )}
            {roles.isError && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-destructive">
                  {getErrorMessage(roles.error)}
                </td>
              </tr>
            )}
            {roles.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No hay roles.
                </td>
              </tr>
            )}
            {roles.data?.map((r) => {
              const isSystem = SYSTEM_ROLE_CODES.has(r.code);
              return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span>{r.name}</span>
                      {isSystem && (
                        <span title="Rol del sistema">
                          <Lock className="h-3 w-3 text-amber-500" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.description ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-medium text-brand-from">
                      {r.permissions.length}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {r.userCount ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
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
                          onClick={() => handleRemove(r.id, r.name)}
                          disabled={isSystem || remove.isPending}
                          title={isSystem ? 'Rol del sistema (no eliminable)' : 'Eliminar'}
                          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </Can>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {formState && (
        <RoleFormDialog
          roleId={formState.mode === 'edit' ? formState.id : null}
          onClose={() => setFormState(null)}
        />
      )}

      <Can permission="roles.create">
        <Fab label="Nuevo rol" onClick={() => setFormState({ mode: 'create' })} />
      </Can>
    </div>
  );
}
