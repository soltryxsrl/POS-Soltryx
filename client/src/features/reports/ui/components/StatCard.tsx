'use client';

import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
}

const TONE: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-card',
  success: 'bg-green-50',
  warning: 'bg-amber-50',
  destructive: 'bg-destructive/10',
};

export function StatCard({ label, value, hint, tone = 'default' }: Props) {
  return (
    <div className={`rounded-lg border p-4 ${TONE[tone]}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
