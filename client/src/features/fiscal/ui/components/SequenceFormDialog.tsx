'use client';

import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import {
  useCreateFiscalSequence,
  useFiscalDocTypes,
  useRenewFiscalSequence,
} from '../../application/hooks/use-fiscal';
import type { FiscalSequence } from '../../domain/types';

interface Props {
  /** Si se provee, modo "renovar" (mismo docType, nueva secuencia activa). */
  renewFrom?: FiscalSequence;
  onClose: () => void;
}

export function SequenceFormDialog({ renewFrom, onClose }: Props) {
  const docTypes = useFiscalDocTypes({ activeOnly: true });
  const create = useCreateFiscalSequence();
  const renew = useRenewFiscalSequence();
  const isRenew = !!renewFrom;

  const [docType, setDocType] = useState(renewFrom?.docType ?? '');
  const [prefix, setPrefix] = useState(renewFrom?.prefix ?? '');
  const [rangeFrom, setRangeFrom] = useState(
    renewFrom ? String(BigInt(renewFrom.rangeTo) + 1n) : '1',
  );
  const [rangeTo, setRangeTo] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pending = isRenew ? renew.isPending : create.isPending;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const from = parseInt(rangeFrom, 10);
    const to = parseInt(rangeTo, 10);
    if (!docType) {
      setError('Selecciona el tipo de comprobante.');
      return;
    }
    if (!prefix.trim()) {
      setError('Indica el prefijo del NCF.');
      return;
    }
    if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {
      setError('rangeTo debe ser mayor o igual a rangeFrom.');
      return;
    }
    try {
      if (isRenew) {
        await renew.mutateAsync({
          docType,
          input: { prefix, rangeFrom: from, rangeTo: to, validUntil: validUntil || undefined },
        });
      } else {
        await create.mutateAsync({
          docType,
          prefix,
          rangeFrom: from,
          rangeTo: to,
          validUntil: validUntil || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title={isRenew ? `Renovar secuencia ${renewFrom!.docType}` : 'Nueva secuencia fiscal'}
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Tipo de comprobante" required>
          <Select
            value={docType}
            onChange={(e) => {
              setDocType(e.target.value);
              if (!prefix) setPrefix(e.target.value);
            }}
            disabled={isRenew}
          >
            <option value="">Seleccione</option>
            {docTypes.data?.map((t) => (
              <option key={t.code} value={t.code}>
                {t.code} — {t.name}
              </option>
            ))}
          </Select>
          {isRenew && (
            <p className="mt-1 text-xs text-muted-foreground">
              Al renovar, la secuencia activa anterior queda desactivada como histórico
              y esta nueva toma su lugar.
            </p>
          )}
        </FormField>

        <FormField label="Prefijo NCF" required hint="Ej: 'E32' para e-CF, 'B02' para NCF clásico.">
          <Input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            maxLength={8}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Desde" required>
            <Input
              type="number"
              min={1}
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
            />
          </FormField>
          <FormField label="Hasta" required>
            <Input
              type="number"
              min={1}
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Válido hasta" hint="Fecha de vencimiento del rango (DGII).">
          <Input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </FormField>

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
            {pending ? 'Guardando...' : isRenew ? 'Renovar' : 'Crear secuencia'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
