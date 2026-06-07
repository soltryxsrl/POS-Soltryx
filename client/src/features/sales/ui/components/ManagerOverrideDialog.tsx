'use client';

import { useState, type FormEvent } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';

interface Props {
  /** Mensaje del servidor (incluye porcentaje aplicado y umbral). */
  message: string;
  /** % del descuento que supera el umbral, calculado en el server. */
  percentage?: number;
  thresholdPct?: number;
  /** Error de credenciales (después del primer intento). */
  errorMessage?: string | null;
  onConfirm: (credentials: { emailOrUsername: string; password: string }) => void;
  onClose: () => void;
  submitting?: boolean;
}

export function ManagerOverrideDialog({
  message,
  percentage,
  thresholdPct,
  errorMessage,
  onConfirm,
  onClose,
  submitting,
}: Props) {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim() || !password) return;
    onConfirm({ emailOrUsername: emailOrUsername.trim(), password });
  };

  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title="Autorización de descuento"
      size="md"
      forceMode="modal"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Se requiere autorización de un manager
            </h3>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
              {message}
            </p>
            {percentage !== undefined && thresholdPct !== undefined && (
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                Descuento aplicado: {percentage.toFixed(1)}% · umbral:{' '}
                {thresholdPct}%
              </p>
            )}
          </div>
        </div>

        <FormField
          label="Email o usuario del manager"
          required
          hint="El manager debe tener el permiso para autorizar descuentos."
        >
          <Input
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            maxLength={180}
            required
          />
        </FormField>

        <FormField label="Contraseña" required>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            maxLength={200}
            required
          />
        </FormField>

        {errorMessage && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {errorMessage}
          </p>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting || !emailOrUsername.trim() || !password}
          >
            {submitting ? 'Verificando…' : 'Autorizar'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
