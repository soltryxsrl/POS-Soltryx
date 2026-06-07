'use client';

import { useState, type FormEvent } from 'react';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Textarea } from '@/shared/ui/controls/Textarea';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useRecordCashMovement } from '../../application/hooks/use-cash';
import type { CashMovementType } from '../../domain/types';

interface Props {
  sessionId: string;
  onClose: () => void;
}

export function CashMovementDialog({ sessionId, onClose }: Props) {
  const mut = useRecordCashMovement(sessionId);
  const [type, setType] = useState<CashMovementType>('PAID_IN');
  const [amount, setAmount] = useState('0.00');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (Number(amount) <= 0) {
      setError('El monto debe ser mayor que cero.');
      return;
    }
    if (reason.trim().length < 3) {
      setError('El motivo es obligatorio (mín. 3 caracteres).');
      return;
    }
    try {
      await mut.mutateAsync({ type, amount, reason: reason.trim() });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell open onClose={onClose} title="Movimiento de caja" size="md">
      <form onSubmit={onSubmit} className="space-y-5">
        <FormField label="Tipo">
          <div className="grid grid-cols-2 gap-2">
            <TypeButton
              active={type === 'PAID_IN'}
              onClick={() => setType('PAID_IN')}
              icon={<ArrowDownToLine className="h-4 w-4 text-emerald-600" />}
              title="Entrada"
              subtitle="Entra efectivo a caja"
            />
            <TypeButton
              active={type === 'PAID_OUT'}
              onClick={() => setType('PAID_OUT')}
              icon={<ArrowUpFromLine className="h-4 w-4 text-amber-600" />}
              title="Salida"
              subtitle="Sale efectivo de caja"
            />
          </div>
        </FormField>

        <FormField label="Monto" required>
          <Input
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            pattern="^\d+(\.\d{1,2})?$"
            inputMode="decimal"
            className="text-lg font-medium"
          />
        </FormField>

        <FormField
          label="Motivo"
          required
          hint="Aparece en el reporte de cierre y en el reporte X/Z."
        >
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={255}
            minLength={3}
            placeholder={
              type === 'PAID_IN'
                ? 'Ej: Fondo adicional del propietario'
                : 'Ej: Vale para el motoconcho, pago de la luz...'
            }
            className="min-h-[80px]"
          />
        </FormField>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending ? 'Registrando...' : 'Registrar'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}

function TypeButton({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-2 rounded-xl border-2 px-3 py-2 text-left transition',
        active
          ? 'border-brand-from bg-brand-tint'
          : 'border-border bg-background hover:border-foreground/20',
      )}
    >
      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-muted">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}
