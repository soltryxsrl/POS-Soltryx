'use client';

import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface Props {
  className?: string;
  children: ReactNode;
}

/**
 * Footer estándar para formularios/modales.
 * - Right-aligned, Cancel (izq) → Primary (der).
 * - Barra PEGADA al fondo del modal y al ras del borde inferior:
 *   · `sticky bottom-0` la mantiene visible aunque el cuerpo scrollee.
 *   · `-mx-6` cancela el padding horizontal del cuerpo (full-bleed).
 *   · El padding INFERIOR lo quita MaintenanceShell vía `:has(.form-footer)`
 *     (un contenedor `overflow-y-auto` SIEMPRE pinta su `padding-bottom`, así
 *     que un margen negativo no alcanzaba a taparlo → se veía "flotando" con
 *     una franja debajo). Por eso la clave es la clase `form-footer`.
 */
export function FormFooter({ className, children }: Props) {
  return (
    <div
      className={cn(
        'form-footer sticky bottom-0 z-10 -mx-6 mt-6 flex items-center justify-end gap-2',
        'border-t border-border bg-card px-6 py-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
