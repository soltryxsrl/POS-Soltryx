'use client';

import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useCreateCashRegister } from '../../application/hooks/use-cash';

interface Props {
  /** Nombre de la sucursal activa — la caja se crea en ella. */
  branchName: string;
  onClose: () => void;
}

export function CashRegisterFormDialog({ branchName, onClose }: Props) {
  const create = useCreateCashRegister();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('El nombre de la caja es obligatorio.');
      return;
    }
    try {
      await create.mutateAsync({ name: name.trim() });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell open onClose={onClose} title="Nueva caja" size="sm">
      <form onSubmit={onSubmit} className="space-y-5">
        <p className="text-xs text-muted-foreground">
          Se crea en la sucursal activa:{' '}
          <span className="font-medium text-foreground">{branchName}</span>.
        </p>
        <FormField label="Nombre de la caja" required>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Caja 2"
            maxLength={60}
          />
        </FormField>
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creando...' : 'Crear caja'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
