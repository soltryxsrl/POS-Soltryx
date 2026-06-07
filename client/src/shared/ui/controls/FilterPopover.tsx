'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface Props {
  /** Nº de filtros activos — muestra el badge y resalta el botón. */
  activeCount?: number;
  /** Limpia todos los filtros (se muestra "Limpiar" si hay activos). */
  onClear?: () => void;
  label?: string;
  /** Controles de filtro a mostrar dentro del panel. */
  children: ReactNode;
}

/**
 * Botón "Filtros (n)" que abre un panel flotante con los controles de filtro.
 * Colapsa los filtros a una sola acción → recupera alto vertical para la tabla.
 * Cierra al hacer click fuera o con Escape.
 */
export function FilterPopover({ activeCount = 0, onClear, label = 'Filtros', children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition',
          activeCount > 0
            ? 'border-brand-from/60 bg-brand-from/10 text-brand-from'
            : 'border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        {label}
        {activeCount > 0 && (
          <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-from px-1 text-[11px] font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-border bg-card p-3 shadow-xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            {activeCount > 0 && onClear && (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-3 w-3" /> Limpiar
              </button>
            )}
          </div>
          <div className="space-y-3">{children}</div>
        </div>
      )}
    </div>
  );
}
