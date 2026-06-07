'use client';

import { cn } from '@/shared/lib/cn';

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  tabs: { value: T; label: string }[];
  className?: string;
}

/** Control segmentado de pestañas (in-page). Una sola sección visible a la vez. */
export function Tabs<T extends string>({ value, onChange, tabs, className }: Props<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex gap-1 rounded-xl border border-border/60 bg-card p-1',
        className,
      )}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-medium transition',
              active
                ? 'bg-gradient-to-r from-brand-from to-brand-to text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
