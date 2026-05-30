'use client';

import { cn } from '@/shared/lib/cn';

interface Props {
  value: number;
  max: number;
  /** Override del color de la barra rellena (por defecto usa el gradiente brand). */
  barClassName?: string;
  className?: string;
}

export function BarRow({ value, max, barClassName, className }: Props) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-muted', className)}>
      <div
        className={cn(
          'h-full rounded-full bg-gradient-to-r from-brand-from to-brand-to',
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
