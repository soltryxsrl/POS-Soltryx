'use client';

import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface Props {
  className?: string;
  children: ReactNode;
}

/**
 * Footer estándar para formularios/modales.
 * - Right-aligned
 * - Border-top sutil
 * - Cancel (izq) → Primary (der), ambos con `<Button />` del mismo size.
 */
export function FormFooter({ className, children }: Props) {
  return (
    <div
      className={cn(
        'mt-6 flex items-center justify-end gap-2 border-t border-border/50 pt-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
