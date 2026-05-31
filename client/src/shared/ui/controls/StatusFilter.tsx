'use client';

import { cn } from '@/shared/lib/cn';

interface Props {
  /** Filtro isActive: undefined = todos, 'true' = activos, 'false' = inactivos. */
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  className?: string;
}

const OPTIONS: { label: string; value: string | undefined }[] = [
  { label: 'Todos', value: undefined },
  { label: 'Activos', value: 'true' },
  { label: 'Inactivos', value: 'false' },
];

/**
 * Control segmentado Todos / Activos / Inactivos para filtrar por estado.
 * Reemplaza los dos chips sueltos (Activos/Inactivos): un solo control que
 * siempre muestra el estado actual e incluye "Todos" explícito.
 */
export function StatusFilter({ value, onChange, className }: Props) {
  return (
    <div
      role="group"
      aria-label="Filtrar por estado"
      className={cn(
        'inline-flex overflow-hidden rounded-lg border border-border/60',
        className,
      )}
    >
      {OPTIONS.map((o, i) => {
        const active = value === o.value;
        return (
          <button
            key={o.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition',
              i > 0 && 'border-l border-border/60',
              active
                ? 'bg-brand-from/10 text-brand-from'
                : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
