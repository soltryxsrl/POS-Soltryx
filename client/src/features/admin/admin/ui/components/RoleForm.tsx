'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Switch } from '@/shared/ui/controls/Switch';
import {
  useAdminPermissions,
  useCreateAdminRole,
  useUpdateAdminRole,
} from '../../application/hooks/use-admin-roles';
import type { AdminPermission, AdminRole } from '../../domain/types';

interface Props {
  role?: AdminRole;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormState {
  code: string;
  name: string;
  description: string;
  permissionIds: Set<string>;
}

function initialState(role?: AdminRole): FormState {
  return {
    code: role?.code ?? '',
    name: role?.name ?? '',
    description: role?.description ?? '',
    permissionIds: new Set(role?.permissions.map((p) => p.id) ?? []),
  };
}

function groupByModule(perms: AdminPermission[]): Record<string, AdminPermission[]> {
  const out: Record<string, AdminPermission[]> = {};
  for (const p of perms) {
    if (!out[p.module]) out[p.module] = [];
    out[p.module].push(p);
  }
  return out;
}

export function RoleForm({ role, onSuccess, onCancel }: Props) {
  const isEdit = !!role;
  const perms = useAdminPermissions();
  const create = useCreateAdminRole();
  const update = useUpdateAdminRole(role?.id ?? '');
  const [form, setForm] = useState<FormState>(() => initialState(role));
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setForm(initialState(role));
    setError(null);
  }, [role]);

  const grouped = useMemo(() => (perms.data ? groupByModule(perms.data) : {}), [perms.data]);
  const submitting = isEdit ? update.isPending : create.isPending;

  const togglePerm = (id: string) => {
    setForm((f) => {
      const next = new Set(f.permissionIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...f, permissionIds: next };
    });
  };

  const toggleModule = (mod: string, selectAll: boolean) => {
    const ids = (grouped[mod] ?? []).map((p) => p.id);
    setForm((f) => {
      const next = new Set(f.permissionIds);
      if (selectAll) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return { ...f, permissionIds: next };
    });
  };

  const toggleExpanded = (mod: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) next.delete(mod);
      else next.add(mod);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const permissionIds = Array.from(form.permissionIds);
    try {
      if (isEdit) {
        await update.mutateAsync({
          name: form.name,
          description: form.description || undefined,
          permissionIds,
        });
      } else {
        await create.mutateAsync({
          code: form.code.toUpperCase(),
          name: form.name,
          description: form.description || undefined,
          permissionIds,
        });
      }
      onSuccess();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Código" required>
          <Input
            required
            disabled={isEdit}
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            pattern="^[A-Z][A-Z0-9_]*$"
            className="font-mono"
            placeholder="WAREHOUSE_OPS"
          />
        </FormField>
        <FormField label="Nombre" required>
          <Input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </FormField>
      </div>

      <FormField label="Descripción">
        <Input
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Resumen de qué puede hacer este rol"
        />
      </FormField>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="text-xs font-medium text-muted-foreground">Permisos</div>
          <div className="text-xs text-muted-foreground">
            {form.permissionIds.size} de {perms.data?.length ?? 0} seleccionados
          </div>
        </div>

        {perms.isLoading ? (
          <div className="rounded-xl border border-border bg-background px-3 py-6 text-center text-sm text-muted-foreground">
            Cargando permisos...
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(grouped).map(([mod, list]) => {
              const ids = list.map((p) => p.id);
              const checkedCount = ids.filter((id) => form.permissionIds.has(id)).length;
              const allChecked = checkedCount === ids.length;
              const isOpen = expanded.has(mod);
              return (
                <div
                  key={mod}
                  className={cn(
                    'overflow-hidden rounded-xl border transition-colors',
                    allChecked
                      ? 'border-brand-from/40 bg-brand-tint/30'
                      : 'border-border bg-card',
                  )}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(mod)}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? 'Contraer' : 'Expandir'}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-muted-foreground transition-transform',
                          isOpen ? 'rotate-0' : '-rotate-90',
                        )}
                      />
                      <span className="text-sm font-semibold uppercase tracking-wide text-foreground">
                        {mod}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {checkedCount}/{ids.length}
                      </span>
                    </button>
                    <Switch
                      checked={allChecked}
                      onChange={(v) => toggleModule(mod, v)}
                    />
                  </div>

                  {isOpen && (
                    <div className="grid grid-cols-1 gap-2 border-t border-border/60 bg-background/40 px-4 py-3 sm:grid-cols-2">
                      {list.map((p) => (
                        <Switch
                          key={p.id}
                          checked={form.permissionIds.has(p.id)}
                          onChange={() => togglePerm(p.id)}
                          label={p.name}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
          {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear rol'}
        </Button>
      </FormFooter>
    </form>
  );
}
