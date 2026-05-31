'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Switch } from '@/shared/ui/controls/Switch';
import { useBranches } from '@/features/branches/application/hooks/use-branches';
import { useAdminRoles } from '../../application/hooks/use-admin-roles';
import {
  useCreateAdminUser,
  useUpdateAdminUser,
} from '../../application/hooks/use-admin-users';
import type { AdminUser } from '../../domain/types';

interface Props {
  user?: AdminUser;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormState {
  email: string;
  username: string;
  fullName: string;
  password: string;
  isActive: boolean;
  roleIds: string[];
  branchId: string;
}

function initialState(user?: AdminUser): FormState {
  return {
    email: user?.email ?? '',
    username: user?.username ?? '',
    fullName: user?.fullName ?? '',
    password: '',
    isActive: user?.isActive ?? true,
    roleIds: user?.roles.map((r) => r.id) ?? [],
    branchId: user?.branchId ?? '',
  };
}

export function UserForm({ user, onSuccess, onCancel }: Props) {
  const isEdit = !!user;
  const roles = useAdminRoles();
  const branches = useBranches({ isActive: 'true', limit: 100 });
  const create = useCreateAdminUser();
  const update = useUpdateAdminUser(user?.id ?? '');
  const [form, setForm] = useState<FormState>(() => initialState(user));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialState(user));
    setError(null);
  }, [user]);

  const submitting = isEdit ? update.isPending : create.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit) {
        const payload: Parameters<typeof update.mutateAsync>[0] = {
          email: form.email,
          username: form.username,
          fullName: form.fullName,
          isActive: form.isActive,
          roleIds: form.roleIds,
          branchId: form.branchId || undefined,
        };
        if (form.password) payload.password = form.password;
        await update.mutateAsync(payload);
      } else {
        await create.mutateAsync({
          email: form.email,
          username: form.username,
          fullName: form.fullName,
          password: form.password,
          isActive: form.isActive,
          roleIds: form.roleIds,
          branchId: form.branchId || undefined,
        });
      }
      onSuccess();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const toggleRole = (id: string) => {
    setForm((f) => ({
      ...f,
      roleIds: f.roleIds.includes(id)
        ? f.roleIds.filter((x) => x !== id)
        : [...f.roleIds, id],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Email" required>
          <Input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </FormField>
        <FormField label="Username" required>
          <Input
            required
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          />
        </FormField>
      </div>

      <FormField label="Nombre completo" required>
        <Input
          required
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
        />
      </FormField>

      <FormField label="Sucursal">
        <select
          value={form.branchId}
          onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
          className="w-full rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 text-sm outline-none focus:border-brand-from/60 focus:ring-2 focus:ring-brand-from/20"
        >
          <option value="">— Sin sucursal (solo ADMIN) —</option>
          {branches.data?.items.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label={isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
        required={!isEdit}
      >
        <Input
          type="password"
          required={!isEdit}
          minLength={isEdit ? 0 : 8}
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder={isEdit ? '••••••••' : 'Mínimo 8 caracteres'}
        />
      </FormField>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Roles</div>
        {roles.isLoading ? (
          <div className="text-sm text-muted-foreground">Cargando roles...</div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {roles.data?.map((r) => {
              const selected = form.roleIds.includes(r.id);
              return (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => toggleRole(r.id)}
                  aria-pressed={selected}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm transition',
                    selected
                      ? 'border-brand-from bg-brand-tint/50'
                      : 'border-border bg-background hover:border-foreground/20',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition',
                      selected
                        ? 'border-brand-from bg-brand-from text-white'
                        : 'border-border bg-card',
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{r.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.code}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isEdit && (
        <Switch
          checked={form.isActive}
          onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
          label="Usuario activo"
        />
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      <FormFooter>
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
        </Button>
      </FormFooter>
    </form>
  );
}
