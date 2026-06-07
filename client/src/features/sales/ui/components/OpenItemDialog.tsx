'use client';

import { useState, type FormEvent } from 'react';
import { Tag } from 'lucide-react';
import { formatMoney } from '@/shared/lib/format';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useCartStore } from '../../application/stores/cart.store';

interface Props {
  onClose: () => void;
}

/** Tasa estándar de ITBIS en RD para el toggle "gravado". */
const ITBIS_RATE = '18.00';

/**
 * Captura una línea de "monto libre" (ítem genérico): descripción + precio +
 * ITBIS tecleados por el cajero. No referencia un producto del catálogo, por
 * lo que no mueve inventario ni participa en promociones.
 */
export function OpenItemDialog({ onClose }: Props) {
  const addOpenItem = useCartStore((s) => s.addOpenItem);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [taxed, setTaxed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const amountNum = Number(amount);
  const qtyNum = Number(quantity);
  const showSubtotal = Number.isFinite(amountNum) && amountNum > 0;
  const lineSubtotal = amountNum * (Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 1);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const desc = description.trim();
    if (!desc) {
      setError('Escribe una descripción para la línea.');
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError('El precio debe ser mayor que 0.');
      return;
    }
    if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
      setError('La cantidad debe ser un entero mayor que 0.');
      return;
    }
    addOpenItem({
      description: desc,
      unitPrice: amountNum.toFixed(2),
      taxRate: taxed ? ITBIS_RATE : '0.00',
      quantity: qtyNum,
    });
    onClose();
  };

  return (
    <MaintenanceShell open onClose={onClose} title="Venta de monto libre" size="md">
      <form onSubmit={onSubmit} className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Agrega una línea sin producto del catálogo: tú tecleas el precio. No
          mueve inventario ni aplica promociones.
        </p>

        <FormField label="Descripción" required>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={180}
            placeholder="Ej: Servicio de instalación, artículo varios..."
            autoFocus
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Precio unitario (RD$)" required>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              pattern="^\d+(\.\d{1,2})?$"
              placeholder="0.00"
              className="text-lg font-medium"
            />
          </FormField>
          <FormField label="Cantidad">
            <Input
              type="number"
              min={1}
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </FormField>
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={taxed}
            onChange={(e) => setTaxed(e.target.checked)}
            className="h-4 w-4 accent-brand-from"
          />
          <span>Cobrar ITBIS (18%)</span>
          <span className="ml-auto text-xs font-medium text-muted-foreground">
            {taxed ? 'Gravado' : 'Exento'}
          </span>
        </label>

        {showSubtotal && (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Importe (precio × cantidad)</span>
              <span className="font-semibold tabular-nums">
                {formatMoney(lineSubtotal.toFixed(2))}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              El ITBIS y el total final se calculan en el carrito según la
              configuración del negocio.
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <FormFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            <Tag className="h-4 w-4" />
            Agregar al carrito
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
