'use client';

import { useState, type FormEvent } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useAdjustStock } from '../../application/hooks/use-inventory';

interface Props {
  productId: string;
  /** Si se ajusta una variante específica. Si null, ajusta el padre. */
  variantId?: string | null;
  /** Etiqueta visible en el título ("Polo · Talla M"). Opcional. */
  contextLabel?: string;
  onClose: () => void;
}

const QUICK_STEPS = [1, 5, 10, 50];

function formatQty(n: number): string {
  const rounded = Math.round(n * 1000) / 1000;
  return (rounded >= 0 ? '+' : '') + rounded;
}

export function AdjustStockDialog({ productId, variantId, contextLabel, onClose }: Props) {
  const adjust = useAdjustStock();
  const [quantity, setQuantity] = useState('+0');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const applyDelta = (delta: number) => {
    const current = parseFloat(quantity) || 0;
    setQuantity(formatQty(current + delta));
  };

  const reset = () => setQuantity('+0');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // El backend rechaza el prefijo `+`; lo eliminamos antes de enviar.
      // `-5` se preserva tal cual; `5` se envía sin signo.
      const q = quantity.startsWith('+') ? quantity.slice(1) : quantity;
      await adjust.mutateAsync({
        productId,
        variantId: variantId ?? undefined,
        quantity: q,
        reason,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title={contextLabel ? `Ajustar stock · ${contextLabel}` : 'Ajustar stock'}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Cantidad" required htmlFor="qty">
          <Input
            id="qty"
            required
            autoFocus
            keepZero
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            pattern="^[+-]?\d+(\.\d{1,3})?$"
            inputMode="decimal"
          />
          <div className="mt-2 flex flex-nowrap items-center gap-1">
            {QUICK_STEPS.map((n) => (
              <QuickButton key={`minus-${n}`} onClick={() => applyDelta(-n)} variant="minus">
                <Minus className="h-3 w-3" />
                {n}
              </QuickButton>
            ))}
            <span className="mx-1 h-5 w-px shrink-0 bg-border" />
            {QUICK_STEPS.map((n) => (
              <QuickButton key={`plus-${n}`} onClick={() => applyDelta(n)} variant="plus">
                <Plus className="h-3 w-3" />
                {n}
              </QuickButton>
            ))}
            <button
              type="button"
              onClick={reset}
              title="Reiniciar"
              className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </FormField>

        <FormField label="Motivo" required htmlFor="reason">
          <Input
            id="reason"
            required
            minLength={3}
            maxLength={255}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Rotura, Conteo físico, Donación..."
          />
        </FormField>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={adjust.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={adjust.isPending}>
            {adjust.isPending ? 'Guardando...' : 'Aplicar ajuste'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}

function QuickButton({
  onClick,
  variant,
  children,
}: {
  onClick: () => void;
  variant: 'plus' | 'minus';
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-0.5 rounded-full border px-2 text-xs font-medium transition',
        variant === 'plus'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40'
          : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/40',
      )}
    >
      {children}
    </button>
  );
}
