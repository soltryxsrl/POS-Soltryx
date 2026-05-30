'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Can } from '@/features/auth/ui/components/Can';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Fab } from '@/shared/ui/controls/Fab';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import {
  useAdminUsers,
  useRemoveAdminUser,
} from '../../application/hooks/use-admin-users';
import { UserFormDialog } from './UserFormDialog';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return '—';
  }
}

export function UsersTable() {
  const [q, setQ] = useState('');
  const [onlyActive, setOnlyActive] = useState<boolean | null>(null);
  const users = useAdminUsers({
    q: q || undefined,
    isActive: onlyActive ?? undefined,
    limit: 100,
  });
  const remove = useRemoveAdminUser();
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar por email, username o nombre..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-80"
        />
        <div className="w-48">
          <Select
            value={onlyActive === null ? '' : onlyActive ? 'true' : 'false'}
            onChange={(e) =>
              setOnlyActive(e.target.value === '' ? null : e.target.value === 'true')
            }
          >
            <option value="">Todos</option>
            <option value="true">Solo activos</option>
            <option value="false">Solo inactivos</option>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Username</th>
              <th className="px-4 py-2">Roles</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Último login</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            )}
            {users.isError && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-destructive">
                  {getErrorMessage(users.error)}
                </td>
              </tr>
            )}
            {users.data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No hay usuarios.
                </td>
              </tr>
            )}
            {users.data?.items.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{u.fullName}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.username}</td>
                <td className="px-4 py-3">
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
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      u.isActive
                        ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700'
                        : 'rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600'
                    }
                  >
                    {u.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(u.lastLoginAt)}
                </td>
                <td className="px-4 py-3 text-right">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.data && (
        <div className="text-xs text-muted-foreground">
          Mostrando {users.data.items.length} de {users.data.total}
        </div>
      )}

      {formState && (
        <UserFormDialog
          userId={formState.mode === 'edit' ? formState.id : null}
          onClose={() => setFormState(null)}
        />
      )}

      <Can permission="users.create">
        <Fab
          label="Nuevo usuario"
          onClick={() => setFormState({ mode: 'create' })}
        />
      </Can>
    </div>
  );
}
