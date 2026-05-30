'use client';

import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useSetCurrencyRate } from '../../application/hooks/use-currencies';
import type { Currency } from '../../domain/types';

interface Props {
  currency: Currency;
  onClose: () => void;
}

export function SetRateDialog({ currency, onClose }: Props) {
  const setRate = useSetCurrencyRate();
  const [rate, setRate_] = useState(currency.rateToBase ?? '');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d+(\.\d{1,6})?$/.test(rate) || parseFloat(rate) <= 0) {
      setError('Ingresa un número positivo (hasta 6 decimales).');
      return;
    }
    try {
      await setRate.mutateAsync({ code: currency.code, input: { rate } });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title={`Tasa de cambio · ${currency.code}`}
      size="sm"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Cuánto vale <strong>1 {currency.symbol}</strong> en pesos dominicanos.
          Esta tasa se usará en cada cobro en {currency.code} hasta que la cambies.
        </p>

        <FormField
          label={`1 ${currency.code} = ? DOP`}
          hint="Acepta hasta 6 decimales."
          required
        >
          <Input
            autoFocus
            value={rate}
            onChange={(e) => setRate_(e.target.value)}
            placeholder="63.50"
            inputMode="decimal"
          />
        </FormField>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={setRate.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={setRate.isPending}>
            {setRate.isPending ? 'Guardando...' : 'Actualizar tasa'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
