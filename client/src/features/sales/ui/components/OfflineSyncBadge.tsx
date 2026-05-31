'use client';

import { RefreshCw, TriangleAlert } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useOfflineSalesSync } from '../../application/hooks/use-offline-sales';

/**
 * Indicador (en el header) de ventas guardadas offline. Monta el motor de
 * sincronización (`useOfflineSalesSync`) que drena la cola al reconectar, y
 * muestra cuántas ventas esperan sincronizar o quedaron con conflicto.
 * No renderiza nada cuando no hay pendientes ni conflictos.
 */
export function OfflineSyncBadge() {
  const { pending, failed } = useOfflineSalesSync();
  if (pending === 0 && failed === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {pending > 0 && (
        <span
          title={`${pending} venta(s) sin conexión esperando sincronizar`}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
            'border-amber-300 bg-amber-50 text-amber-800',
            'dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200',
          )}
        >
          <RefreshCw className="h-3 w-3" />
          {pending} por sincronizar
        </span>
      )}
      {failed > 0 && (
        <span
          title={`${failed} venta(s) no se pudieron sincronizar (sesión cerrada, stock u otra validación). Requieren revisión.`}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
            'border-red-300 bg-red-50 text-red-700',
            'dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300',
          )}
        >
          <TriangleAlert className="h-3 w-3" />
          {failed} con conflicto
        </span>
      )}
    </div>
  );
}
