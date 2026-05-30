'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { KeyRound, Mail, Shield, UserRound } from 'lucide-react';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { useChangePassword } from '@/features/auth/application/hooks/use-change-password';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';

export default function ProfilePage() {
  const { user } = useAuth();
  const [showChange, setShowChange] = useState(false);

  if (!user) {
    return (
      <div className="py-12 text-center text-muted-foreground">Cargando perfil...</div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Mi Perfil</h1>

      <div className="flex items-center gap-4 rounded-2xl border bg-gradient-to-br from-brand-tint via-card to-brand-soft p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-from to-brand-to text-lg font-semibold text-white shadow-md shadow-brand-from/30">
          {getInitials(user.fullName)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold text-slate-900">
            {user.fullName}
          </div>
          <div className="truncate text-sm text-slate-500">@{user.username}</div>
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <Field icon={<UserRound className="h-4 w-4" />} label="Nombre" value={user.fullName} />
        <Field icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
        <Field icon={<UserRound className="h-4 w-4" />} label="Usuario" value={user.username} />
        <Field
          icon={<Shield className="h-4 w-4" />}
          label="Roles"
          value={user.roles.length ? user.roles.join(', ') : '—'}
        />
      </dl>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <KeyRound className="h-4 w-4 text-slate-400" />
              Seguridad
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Cambia tu contraseña periódicamente para mantener tu cuenta segura.
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowChange(true)}>
            Cambiar contraseña
          </Button>
        </div>
      </div>

      <div className="pt-2">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver al inicio
        </Link>
      </div>

      {showChange && <ChangePasswordModal onClose={() => setShowChange(false)} />}
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const change = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirm) {
      setError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('La nueva contraseña debe ser distinta de la actual.');
      return;
    }
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell open onClose={onClose} title="Cambiar contraseña" size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Contraseña actual" required>
          <Input
            type="password"
            autoFocus
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </FormField>

        <FormField label="Nueva contraseña" required>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
          />
          <p className="mt-1 text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        </FormField>

        <FormField label="Confirmar nueva contraseña" required>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={8}
          />
        </FormField>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            Contraseña actualizada correctamente.
          </p>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={change.isPending}>
            {success ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!success && (
            <Button type="submit" disabled={change.isPending}>
              {change.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className="text-slate-400">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}
