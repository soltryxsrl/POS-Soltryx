'use client';

import type { ReactNode } from 'react';
import { Button } from '@/shared/ui/controls/Button';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';

interface Props {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Estilo destructivo (rojo) para acciones como eliminar. */
  destructive?: boolean;
  pending?: boolean;
  /** Error de la acción (ej. el server rechazó el borrado). Se muestra y el diálogo queda abierto. */
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Diálogo de confirmación reutilizable (formato estándar del app, basado en
 * MaintenanceShell). Para acciones sensibles: eliminar, anular, etc.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
  pending,
  error,
  onConfirm,
  onClose,
}: Props) {
  return (
    <MaintenanceShell open onClose={onClose} title={title} size="sm" disableClose={pending}>
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">{message}</div>
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? 'Procesando...' : confirmLabel}
          </Button>
        </FormFooter>
      </div>
    </MaintenanceShell>
  );
}
