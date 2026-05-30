'use client';

import { Printer } from 'lucide-react';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';

interface Props {
  saleNumber: string;
  onClose: () => void;
  /** Llamado cuando el usuario elige "POS 80mm" (térmica). */
  onPick80mm: () => void;
  /** Llamado cuando el usuario elige "Carta (8½ × 11)". */
  onPickLetter: () => void;
}

/**
 * Modal que aparece al pulsar "Imprimir" en el detalle de venta. Permite
 * elegir el formato — térmica 80mm (típico POS) o Carta 8½×11 (láser/inkjet
 * de oficina). Implementado como dialog modal (no drawer) por ser una
 * decisión rápida con 2 opciones.
 */
export function PrintFormatPickerDialog({
  saleNumber,
  onClose,
  onPick80mm,
  onPickLetter,
}: Props) {
  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title="Formato de impresión"
      size="sm"
      forceMode="modal"
    >
      <p className="text-xs text-muted-foreground">
        Comprobante <span className="font-mono">{saleNumber}</span>
      </p>
      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={() => {
            onPick80mm();
            onClose();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium transition hover:border-brand-from/40 hover:bg-brand-tint/40"
        >
          <Printer className="h-4 w-4" />
          POS 80mm (térmica)
        </button>
        <button
          type="button"
          onClick={() => {
            onPickLetter();
            onClose();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium transition hover:border-brand-from/40 hover:bg-brand-tint/40"
        >
          <Printer className="h-4 w-4" />
          Carta 8½ × 11 (láser / inkjet)
        </button>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          Cancelar
        </button>
      </div>
    </MaintenanceShell>
  );
}
