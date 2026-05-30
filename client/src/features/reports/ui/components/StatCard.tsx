'use client';

import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
}

const TONE: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-card border-border',
  success:
    'bg-emerald-50 border-emerald-200/60 dark:bg-emerald-950/40 dark:border-emerald-800/50',
  warning:
    'bg-amber-50 border-amber-200/60 dark:bg-amber-950/40 dark:border-amber-800/50',
  destructive:
    'bg-red-50 border-red-200/60 dark:bg-red-950/40 dark:border-red-800/50',
};

export function StatCard({ label, value, hint, tone = 'default' }: Props) {
  return (
    <div className={`rounded-xl border p-4 ${TONE[tone]}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
