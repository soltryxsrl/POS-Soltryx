'use client';

import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Textarea } from '@/shared/ui/controls/Textarea';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useCartStore } from '@/features/sales/application/stores/cart.store';
import { useCreateParkedCart } from '../../application/hooks/use-parked-carts';

interface Props {
  cashSessionId: string;
  onClose: () => void;
  onParked?: () => void;
}

export function ParkCartDialog({ cashSessionId, onClose, onParked }: Props) {
  const items = useCartStore((s) => s.items);
  const orderDiscount = useCartStore((s) => s.orderDiscount);
  const clear = useCartStore((s) => s.clear);
  const create = useCreateParkedCart();
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (items.length === 0) {
      setError('El carrito está vacío.');
      return;
    }
    try {
      await create.mutateAsync({
        cashSessionId,
        label: label.trim() || undefined,
        notes: notes.trim() || undefined,
        payload: {
          items: items.map((it) => ({
            productId: it.productId,
            variantId: it.variantId,
            variantName: it.variantName,
            productName: it.productName,
            sku: it.sku,
            unitPrice: it.unitPrice,
            taxRate: it.taxRate,
            quantity: it.quantity,
            discount: it.discount,
            ...(it.notes ? { notes: it.notes } : {}),
          })),
          orderDiscount,
        },
      });
      clear();
      onParked?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell open onClose={onClose} title="Guardar carrito para después" size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          El carrito ({items.length} ítem{items.length === 1 ? '' : 's'}) se guardará en
          espera. Lo retomas más tarde sin perder los ajustes.
        </p>

        <FormField label="Etiqueta (opcional)" hint="Para reconocerlo en la lista.">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={120}
            placeholder="Ej: Sr. Pérez, mesa 4, cliente con crédito..."
            autoFocus
          />
        </FormField>

        <FormField label="Notas">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            className="min-h-[60px]"
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
            {create.isPending ? 'Guardando...' : 'Guardar carrito'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
