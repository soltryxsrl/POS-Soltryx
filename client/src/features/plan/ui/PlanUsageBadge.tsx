'use client';

import { cn } from '@/shared/lib/cn';

/**
 * Badge de uso del plan: "Usuarios 3 / 5". No renderiza nada si el plan es
 * ilimitado (max == null). Se pone rojo al alcanzar el tope.
 */
export function PlanUsageBadge({
  used,
  max,
  noun,
}: {
  used: number;
  max: number | null;
  noun: string;
}) {
  if (max == null) return null;
  const atCap = used >= max;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium',
        atCap
          ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300'
          : 'border-border/60 bg-muted/40 text-muted-foreground',
      )}
      title={atCap ? `Alcanzaste el límite de tu plan (${max} ${noun.toLowerCase()}).` : undefined}
    >
      {noun}:{' '}
      <strong className={cn('tabular-nums', !atCap && 'text-foreground')}>
        {used} / {max}
      </strong>
    </span>
  );
}
