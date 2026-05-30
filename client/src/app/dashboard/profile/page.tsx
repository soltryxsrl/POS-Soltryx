'use client';

import Link from 'next/link';
import { Mail, Shield, UserRound } from 'lucide-react';
import { useAuth } from '@/features/auth/application/hooks/use-auth';

export default function ProfilePage() {
  const { user } = useAuth();

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

      <div className="pt-2">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver al inicio
        </Link>
      </div>
    </div>
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
