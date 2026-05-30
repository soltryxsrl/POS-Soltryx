'use client';

import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/shared/lib/error-message';
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Abrir caja</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Registra el monto inicial en efectivo dentro del cajón.
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Caja registradora</label>
            <select
              required
              value={cashRegisterId}
              onChange={(e) => setCashRegisterId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Selecciona —</option>
              {registers.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} · {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Monto inicial (efectivo en caja)</label>
            <input
              required
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              pattern="^\d+(\.\d{1,2})?$"
              inputMode="decimal"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm transition hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={openSession.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {openSession.isPending ? 'Abriendo...' : 'Abrir caja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
