'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  ChevronRight,
  History,
  ListOrdered,
  Building2,
  Percent,
  ReceiptText,
  Tags,
  Timer,
  Undo2,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

interface ReportItem {
  href: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  /** Permiso requerido para mostrar la tarjeta (opcional). */
  requires?: string;
}

const GROUPS: Array<{ group: string; items: ReportItem[] }> = [
  {
    group: 'Ventas',
    items: [
      { href: '/reports/daily', title: 'Resumen del día', desc: 'Totales del día por método y por usuario.', icon: CalendarDays },
      { href: '/reports/sales-detail', title: 'Detalle de ventas', desc: 'Renglón por renglón con costo y margen. Export CSV/PDF.', icon: ReceiptText },
      { href: '/reports/top-products', title: 'Top productos', desc: 'Más vendidos por ingresos en el rango.', icon: ListOrdered },
      { href: '/reports/by-category', title: 'Ventas por categoría', desc: 'Ingresos y unidades agrupados por categoría.', icon: Tags },
      { href: '/reports/by-seller', title: 'Ventas por vendedor', desc: 'Total vendido y ticket promedio por vendedor (base de comisión).', icon: UserRound },
      { href: '/reports/margins', title: 'Márgenes por producto', desc: 'Ingreso, costo, margen y % por producto.', icon: Percent },
      { href: '/reports/returns', title: 'Devoluciones', desc: 'Análisis de devoluciones por método y razón.', icon: Undo2 },
    ],
  },
  {
    group: 'Precios',
    items: [
      { href: '/reports/price-history', title: 'Historial de precios', desc: 'Cambios de precio (individual/masivo): antes → después.', icon: History },
    ],
  },
  {
    group: 'Inventario',
    items: [
      { href: '/reports/valuation', title: 'Valuación de inventario', desc: 'Costo, valor a precio de lista y margen potencial.', icon: Boxes },
      { href: '/reports/low-stock', title: 'Stock bajo', desc: 'Productos en o bajo su punto de reorden.', icon: AlertTriangle },
      { href: '/reports/slow-movers', title: 'Lento movimiento', desc: 'Stock sin venta reciente (capital inmovilizado).', icon: Timer },
      { href: '/reports/stock-by-branch', title: 'Existencia por sucursal', desc: 'Matriz de stock por producto y sucursal.', icon: Building2, requires: 'branches.switch' },
    ],
  },
];

export default function ReportsIndexPage() {
  const canSwitch = useHasPermission('branches.switch');
  const visible = (it: ReportItem) => !it.requires || (it.requires === 'branches.switch' && canSwitch);

  return (
    <div className="space-y-8">
      <SectionHeader title="Reportes" description="Elige un reporte. Cada uno abre con sus propios filtros." />

      {GROUPS.map(({ group, items }) => {
        const shown = items.filter(visible);
        if (shown.length === 0) return null;
        return (
          <section key={group} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {group}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((it) => {
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-brand-from/40 hover:shadow-sm"
                  >
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-from/10 text-brand-from">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 font-medium text-foreground">
                        {it.title}
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-brand-from" />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{it.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
