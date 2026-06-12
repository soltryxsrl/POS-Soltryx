'use client';

import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { formatMoney } from '@/shared/lib/format';
import { Button } from '@/shared/ui/controls/Button';
import { ConfirmDialog } from '@/shared/ui/feedback/ConfirmDialog';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import {
  PENDING_SALES_CHANGED,
  allPendingSales,
  removePendingSale,
  retryPendingSale,
  type PendingSale,
} from '../../application/offline/sale-offline-queue';

interface Props {
  onClose: () => void;
}

/**
 * Lista las ventas offline que NO se pudieron sincronizar (conflicto: sesión
 * cerrada, stock, validación) con su motivo, y permite reintentarlas o
 * descartarlas. Sin esta vista, una venta ya cobrada al cliente quedaría
 * enterrada en IndexedDB sin que nadie la vea.
 */
export function OfflineConflictsDialog({ onClose }: Props) {
  const [rows, setRows] = useState<PendingSale[]>([]);
  const [toDiscard, setToDiscard] = useState<PendingSale | null>(null);
  const [discarding, setDiscarding] = useState(false);

  const refresh = useCallback(async () => {
    const all = await allPendingSales();
    setRows(all.filter((r) => r.failedReason));
  }, []);

  useEffect(() => {
    void refresh();
    const onChanged = () => void refresh();
    window.addEventListener(PENDING_SALES_CHANGED, onChanged);
    return () => window.removeEventListener(PENDING_SALES_CHANGED, onChanged);
  }, [refresh]);

  const handleRetry = async (rec: PendingSale) => {
    // Vuelve a "pendiente": el motor de sync (useOfflineSalesSync) la reenvía
    // en el próximo ciclo. La idempotencia del server evita duplicar.
    await retryPendingSale(rec);
  };

  const handleDiscard = async () => {
    if (!toDiscard) return;
    setDiscarding(true);
    try {
      await removePendingSale(toDiscard.id);
      setToDiscard(null);
    } finally {
      setDiscarding(false);
    }
  };

  return (
    <MaintenanceShell open onClose={onClose} title="Ventas con conflicto" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Estas ventas se cobraron sin conexión pero el servidor las rechazó al
          sincronizar. Corrige la causa (p. ej. abre una sesión de caja o ajusta el
          stock) y reintenta, o descártalas si ya se registraron de otra forma.
        </p>

        {rows.length === 0 && (
          <p className="rounded-xl border border-border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
            No quedan ventas con conflicto.
          </p>
        )}

        <ul className="space-y-2">
          {rows.map((rec) => {
            const itemsCount = rec.payload.items.reduce(
              (acc, i) => acc + (parseFloat(i.quantity) || 0),
              0,
            );
            const paidTotal = rec.payload.payments.reduce(
              (acc, p) => acc + (parseFloat(p.amount) || 0),
              0,
            );
            return (
              <li
                key={rec.id}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {itemsCount} artículo{itemsCount === 1 ? '' : 's'} ·{' '}
                      {formatMoney(paidTotal.toFixed(2))} tendido
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Cobrada el{' '}
                      {new Date(rec.createdAt).toLocaleString('es-DO', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </div>
                    <p className="mt-1 break-words rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                      {rec.failedReason}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleRetry(rec)}
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      Reintentar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setToDiscard(rec)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Descartar
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {toDiscard && (
        <ConfirmDialog
          title="Descartar venta offline"
          message="La venta se eliminará de la cola y NO se registrará en el sistema. Esta acción no se puede deshacer. ¿Descartar?"
          confirmLabel="Descartar"
          destructive
          pending={discarding}
          onConfirm={() => void handleDiscard()}
          onClose={() => setToDiscard(null)}
        />
      )}
    </MaintenanceShell>
  );
}
