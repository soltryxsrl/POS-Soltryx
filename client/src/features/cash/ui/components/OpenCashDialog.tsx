'use client';

import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { Textarea } from '@/shared/ui/controls/Textarea';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useCashRegisters, useOpenCashSession } from '../../application/hooks/use-cash';

interface Props {
  onClose: () => void;
  onOpened?: () => void;
  defaultCashRegisterId?: string;
}

export function OpenCashDialog({ onClose, onOpened, defaultCashRegisterId }: Props) {
  const registers = useCashRegisters();
  const openSession = useOpenCashSession();
  const [cashRegisterId, setCashRegisterId] = useState(defaultCashRegisterId ?? '');
  const [openingAmount, setOpeningAmount] = useState('0.00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await openSession.mutateAsync({
        cashRegisterId,
        openingAmount,
        notes: notes || undefined,
      });
      onOpened?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell open onClose={onClose} title="Abrir caja" size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Caja registradora" required>
          <Select
            required
            value={cashRegisterId}
            onChange={(e) => setCashRegisterId(e.target.value)}
          >
            <option value="">Seleccione</option>
            {registers.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} · {r.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Monto inicial (efectivo en caja)" required>
          <Input
            required
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            pattern="^\d+(\.\d{1,2})?$"
            inputMode="decimal"
          />
        </FormField>

        <FormField label="Notas">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
          />
        </FormField>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={openSession.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={openSession.isPending}>
            {openSession.isPending ? 'Abriendo...' : 'Abrir caja'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
