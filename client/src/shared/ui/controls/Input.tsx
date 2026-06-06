'use client';

import { forwardRef, type FocusEvent, type InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { displayNumeric, selectAllOnFocus } from '@/shared/lib/numeric-field';

const BASE =
  'w-full rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm transition-all duration-150 outline-none ' +
  'hover:border-border hover:bg-background ' +
  'focus:border-brand-from/60 focus:ring-2 focus:ring-brand-from/20 focus:bg-background ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/30 ' +
  'aria-[invalid=true]:border-red-500/70 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-500/15';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Para inputs numéricos: muestra `0` literal en reposo en vez de vacío.
   * Por defecto los numéricos arrancan vacíos (placeholder `0`) — ver
   * `numeric-field.ts`. Usa esto solo si un cero debe verse explícitamente.
   */
  keepZero?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type, inputMode, value, onFocus, placeholder, keepZero, ...rest },
  ref,
) {
  const numeric =
    type === 'number' || inputMode === 'decimal' || inputMode === 'numeric';

  // Numérico: vacío en reposo cuando es cero (deja ver el placeholder) + select-all al enfocar.
  // `value` puede ser `readonly string[]` (tipo nativo del input); los campos
  // numéricos nunca reciben un arreglo, así que lo excluimos antes de formatear.
  const computedValue =
    numeric && !keepZero
      ? displayNumeric(typeof value === 'object' ? undefined : value)
      : value;
  const handleFocus = numeric
    ? (e: FocusEvent<HTMLInputElement>) => {
        selectAllOnFocus(e);
        onFocus?.(e);
      }
    : onFocus;
  const computedPlaceholder =
    numeric && placeholder === undefined ? '0' : placeholder;

  return (
    <input
      ref={ref}
      type={type}
      inputMode={inputMode}
      value={computedValue}
      onFocus={handleFocus}
      placeholder={computedPlaceholder}
      className={cn(BASE, className)}
      {...rest}
    />
  );
});
