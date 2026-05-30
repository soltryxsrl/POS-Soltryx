'use client';

import { useActiveSessionMine } from '../../application/hooks/use-cash';

/**
 * Pill compacto con el estado actual de la caja del usuario.
 * - Loading / error → null (no muestra ruido en el header).
 * - Sin caja abierta → rose con punto pulsante.
 * - Con caja abierta → emerald con punto sólido.
 */
export function CashStatusPill() {
  const active = useActiveSessionMine();

  if (active.isLoading || active.isError) return null;

  if (!active.data) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
        </span>
        Sin caja abierta
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      Caja abierta
    </span>
  );
}
