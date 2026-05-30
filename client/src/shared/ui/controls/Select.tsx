'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

const BASE =
  'w-full appearance-none rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 pr-10 text-sm text-foreground shadow-sm transition-all duration-150 outline-none ' +
  'hover:border-border hover:bg-background ' +
  'focus:border-brand-from/60 focus:ring-2 focus:ring-brand-from/20 focus:bg-background ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/30 ' +
  'aria-[invalid=true]:border-red-500/70 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-500/15';

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(BASE, className)} {...rest}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
});
