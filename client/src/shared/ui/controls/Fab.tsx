'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accesible label — describe la acción de crear (ej: "Nuevo producto"). */
  label: string;
}

/**
 * Floating Action Button para acciones de "crear" en cualquier pantalla.
 * Se posiciona `fixed` abajo-derecha. Usar uno solo por pantalla.
 */
export const Fab = forwardRef<HTMLButtonElement, Props>(function Fab(
  { label, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full',
        'bg-gradient-to-br from-brand-from to-brand-to text-white',
        'shadow-xl shadow-brand-from/40',
        'transition hover:scale-110 hover:shadow-2xl hover:shadow-brand-from/50 active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-from/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100',
        className,
      )}
      {...rest}
    >
      <Plus className="h-6 w-6" />
    </button>
  );
});
