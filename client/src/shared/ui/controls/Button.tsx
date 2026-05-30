'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

type Variant = 'primary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT: Record<Variant, string> = {
  primary:
    'text-white bg-gradient-to-r from-brand-from to-brand-to shadow-sm shadow-brand-from/25 hover:shadow-md hover:shadow-brand-from/30 hover:brightness-[1.03] active:brightness-95 font-semibold',
  outline:
    'border border-border/60 bg-background text-foreground hover:bg-muted/60 hover:border-border font-medium',
  ghost: 'text-foreground hover:bg-muted/60 font-medium',
  destructive:
    'text-white bg-gradient-to-r from-rose-500 to-red-600 shadow-sm shadow-red-500/25 hover:shadow-md hover:shadow-red-500/30 hover:brightness-[1.03] active:brightness-95 font-semibold',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-12 px-5 text-sm rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all outline-none',
        'focus-visible:ring-2 focus-visible:ring-brand-from/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:brightness-100',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    />
  );
});
