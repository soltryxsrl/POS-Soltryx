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
 * - PEGADO al fondo del modal (`sticky`): los botones de acción quedan siempre
 *   visibles aunque el formulario sea largo y el cuerpo scrollee. Los márgenes
 *   negativos (`-mx-6 -mb-5`) cancelan el padding del cuerpo de MaintenanceShell
 *   (`px-6 py-5`) para que la barra abarque todo el ancho y quede al ras abajo.
 */
export function FormFooter({ className, children }: Props) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 -mx-6 -mb-5 mt-6 flex items-center justify-end gap-2',
        'border-t border-border bg-card px-6 py-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
