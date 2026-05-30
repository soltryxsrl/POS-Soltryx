'use client';

import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

const BASE =
  'w-full min-h-[88px] rounded-xl border border-border/60 bg-background/60 px-3.5 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 shadow-sm transition-all duration-150 outline-none resize-y ' +
  'hover:border-border hover:bg-background ' +
  'focus:border-brand-from/60 focus:ring-2 focus:ring-brand-from/20 focus:bg-background ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/30 ' +
  'aria-[invalid=true]:border-red-500/70 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-500/15';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(BASE, className)} {...rest} />;
});
