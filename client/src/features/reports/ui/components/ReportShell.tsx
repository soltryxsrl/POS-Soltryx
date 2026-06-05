'use client';

import type { ReactNode } from 'react';
import { Input } from '@/shared/ui/controls/Input';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

/**
 * Marco común de una página de reporte: breadcrumb "Reportes › <título>", el
 * título, una barra de filtros propia (opcional) y el contenido del reporte.
 * Reemplaza el view único anterior: cada reporte vive en su propia ruta.
 */
export function ReportShell({
  title,
  description,
  toolbar,
  children,
}: {
  title: string;
  description?: string;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader
        title={title}
        description={description}
        crumbs={[{ label: 'Reportes', href: '/reports' }]}
      />
      {toolbar && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-3 py-2.5">
          {toolbar}
        </div>
      )}
      {children}
    </div>
  );
}

/** Filtro de rango Desde/Hasta (fechas locales YYYY-MM-DD). */
export function RangeInputs({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Desde</span>
      <div className="w-40">
        <Input type="date" value={from} onChange={(e) => onFrom(e.target.value)} />
      </div>
      <span className="text-muted-foreground">Hasta</span>
      <div className="w-40">
        <Input type="date" value={to} onChange={(e) => onTo(e.target.value)} />
      </div>
    </div>
  );
}

/** Filtro de un solo día. */
export function DayInput({ date, onDate }: { date: string; onDate: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Día</span>
      <div className="w-40">
        <Input type="date" value={date} onChange={(e) => onDate(e.target.value)} />
      </div>
    </div>
  );
}
