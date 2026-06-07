'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { usePlan, useUpdatePlan } from '@/features/plan/application/hooks/use-plan';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { Input } from '@/shared/ui/controls/Input';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

/**
 * Gestión de PLAN (Super Admin / Soltryx). Página OCULTA: no aparece en el menú.
 * Cambiar el plan requiere el SECRETO super-admin (env SUPERADMIN_SECRET en el
 * server) — el admin del cliente puede ver esta página pero no puede modificar
 * el plan sin la clave.
 */
export default function SuperAdminPlanPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.roles.some((r) => r === 'ADMIN');
  const plan = usePlan();
  const update = useUpdatePlan();

  const [maxUsers, setMaxUsers] = useState('');
  const [maxBranches, setMaxBranches] = useState('');
  const [secret, setSecret] = useState('');
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Pre-cargar los inputs con el plan actual cuando carga.
  useEffect(() => {
    if (!plan.data) return;
    setMaxUsers(plan.data.maxUsers == null ? '' : String(plan.data.maxUsers));
    setMaxBranches(plan.data.maxBranches == null ? '' : String(plan.data.maxBranches));
  }, [plan.data]);

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        No autorizado.
      </div>
    );
  }

  const parse = (v: string): number | null => {
    const t = v.trim();
    if (t === '') return null;
    const n = Number(t);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setOk(false);
    setErr(null);
    if (!secret.trim()) {
      setErr('Ingresa la clave super-admin.');
      return;
    }
    try {
      await update.mutateAsync({
        secret: secret.trim(),
        maxUsers: parse(maxUsers),
        maxBranches: parse(maxBranches),
      });
      setOk(true);
      setSecret('');
    } catch (e2) {
      setErr(getErrorMessage(e2));
    }
  };

  const fmt = (v: number | null | undefined) => (v == null ? 'Ilimitado' : String(v));

  return (
    <div className="max-w-xl space-y-6">
      <SectionHeader
        title="Plan & Licencia"
        description="Gestión del plan contratado (Super Admin). Requiere la clave super-admin para modificar."
      />

      {/* Plan actual + uso */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Usuarios
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground tabular-nums">
            {plan.data?.usedUsers ?? '—'}{' '}
            <span className="text-base font-medium text-muted-foreground">
              / {fmt(plan.data?.maxUsers)}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sucursales
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground tabular-nums">
            {plan.data?.usedBranches ?? '—'}{' '}
            <span className="text-base font-medium text-muted-foreground">
              / {fmt(plan.data?.maxBranches)}
            </span>
          </div>
        </div>
      </div>

      {/* Formulario de cambio de plan */}
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ShieldCheck className="h-4 w-4 text-brand-from" />
          Cambiar plan
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Máx. usuarios" hint="Vacío = ilimitado">
            <Input
              inputMode="numeric"
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value)}
              placeholder="Ilimitado"
            />
          </FormField>
          <FormField label="Máx. sucursales" hint="Vacío = ilimitado">
            <Input
              inputMode="numeric"
              value={maxBranches}
              onChange={(e) => setMaxBranches(e.target.value)}
              placeholder="Ilimitado"
            />
          </FormField>
        </div>

        <FormField label="Clave super-admin" hint="No editable por el cliente. La conoce solo Soltryx.">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="••••••••"
              className="pl-9"
              autoComplete="off"
            />
          </div>
        </FormField>

        {err && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {err}
          </p>
        )}
        {ok && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            Plan actualizado correctamente.
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Guardando…' : 'Guardar plan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
