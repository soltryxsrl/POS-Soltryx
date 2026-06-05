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

/**
 * Pie de paginación reutilizable para reportes de lista. No renderiza nada si
 * todo cabe en una página. Va dentro de la tarjeta, debajo de la tabla.
 */
export function ReportPager({
  total,
  limit,
  offset,
  onChange,
}: {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
}) {
  if (total <= limit) return null;
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(offset / limit) + 1;
  return (
    <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
      <span>
        {offset + 1}–{Math.min(offset + limit, total)} de {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="rounded-md border border-border/60 px-2 py-1 hover:bg-muted disabled:opacity-40"
        >
          Anterior
        </button>
        <span>
          {page} / {pages}
        </span>
        <button
          type="button"
          onClick={() => onChange(offset + limit)}
          disabled={offset + limit >= total}
          className="rounded-md border border-border/60 px-2 py-1 hover:bg-muted disabled:opacity-40"
        >
          Siguiente
        </button>
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
