'use client';

import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import {
  useSetDefaultPaymentMethod,
  useUpdatePaymentMethod,
} from '../../application/hooks/use-payment-methods';
import type { PaymentMethodConfig } from '../../domain/types';

/** Etiqueta de la clase de comportamiento (fija por clase, no editable). */
const KIND_LABEL: Record<string, string> = {
  CASH: 'Efectivo (caja / vuelto)',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  ACCOUNT: 'Crédito (cuenta por cobrar)',
  OTHER: 'Otro',
};

interface Props {
  method: PaymentMethodConfig;
  onClose: () => void;
}

export function PaymentMethodFormDialog({ method, onClose }: Props) {
  const update = useUpdatePaymentMethod();
  const setDefault = useSetDefaultPaymentMethod();
  const [name, setName] = useState(method.name);
  const [requiresReference, setRequiresReference] = useState(method.requiresReference);
  const [isActive, setIsActive] = useState(method.isActive);
  const [isDefault, setIsDefault] = useState(method.isDefault);
  const [error, setError] = useState<string | null>(null);

  const pending = update.isPending || setDefault.isPending;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError('El nombre es obligatorio.');
      return;
    }
    try {
      await update.mutateAsync({
        code: method.code,
        input: { name: name.trim(), requiresReference, isActive },
      });
      // Marcar como predeterminada es una operación aparte (desmarca las demás).
      if (isDefault && !method.isDefault) {
        await setDefault.mutateAsync(method.code);
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell open onClose={onClose} title="Editar forma de pago" size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Nombre">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Efectivo, Tarjeta, Transferencia…"
          />
        </FormField>

        <FormField label="Comportamiento" hint="Fijo por clase: define cómo se procesa el pago.">
          <Input value={KIND_LABEL[method.code] ?? method.code} disabled readOnly />
        </FormField>

        <div className="space-y-2">
          <label className="flex items-start gap-3 rounded-xl border bg-background p-3">
            <input
              type="checkbox"
              checked={requiresReference}
              onChange={(e) => setRequiresReference(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <div>
              <div className="text-sm font-medium">Pide referencia</div>
              <p className="text-xs text-muted-foreground">
                El POS pedirá un dato (voucher, últimos 4 dígitos) al cobrar con
                esta forma de pago.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border bg-background p-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <div>
              <div className="text-sm font-medium">Activa</div>
              <p className="text-xs text-muted-foreground">
                Si está apagada, no aparece como opción al cobrar.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border bg-background p-3">
            <input
              type="checkbox"
              checked={isDefault}
              disabled={method.isDefault || !isActive}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <div>
              <div className="text-sm font-medium">Predeterminada</div>
              <p className="text-xs text-muted-foreground">
                {method.isDefault
                  ? 'Ya es la forma de pago preseleccionada al cobrar.'
                  : 'Quedará preseleccionada al cobrar (debe estar activa).'}
              </p>
            </div>
          </label>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Guardando...' : 'Actualizar'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
