'use client';

import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface Props {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({
  label,
  required,
  hint,
  htmlFor,
  className,
  children,
}: Props) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-muted-foreground">
        {label}
        {required && (
          <span
            aria-hidden="true"
            className="ml-0.5 font-semibold text-red-500 dark:text-red-400"
          >
            *
          </span>
        )}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
