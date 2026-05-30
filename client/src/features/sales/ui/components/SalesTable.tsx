'use client';

import Link from 'next/link';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useSales } from '../../application/hooks/use-sales';

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  REFUNDED: 'Devuelta',
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-muted text-muted-foreground',
  REFUNDED: 'bg-amber-100 text-amber-800',
};

export function SalesTable() {
  const sales = useSales({ limit: 100 });

  return (
    <div className="rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2">N°</th>
            <th className="px-4 py-2">Fecha</th>
            <th className="px-4 py-2 text-right">Items</th>
            <th className="px-4 py-2 text-right">Total</th>
            <th className="px-4 py-2">Estado</th>
            <th className="px-4 py-2 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sales.isLoading && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                Cargando...
              </td>
            </tr>
          )}
          {sales.isError && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-destructive">
                {getErrorMessage(sales.error)}
              </td>
            </tr>
          )}
          {sales.data?.items.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                Sin ventas todavía.
              </td>
            </tr>
          )}
          {sales.data?.items.map((s) => (
            <tr key={s.id} className="border-b last:border-0">
              <td className="px-4 py-2 font-mono text-xs">{s.saleNumber}</td>
              <td className="px-4 py-2 text-xs">{formatDateTime(s.createdAt)}</td>
              <td className="px-4 py-2 text-right">{s.items.length}</td>
              <td className="px-4 py-2 text-right font-medium">{formatMoney(s.total)}</td>
              <td className="px-4 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[s.status] ?? ''}`}>
                  {STATUS_LABEL[s.status] ?? s.status}
                </span>
              </td>
              <td className="px-4 py-2 text-right">
                <Link
                  href={`/dashboard/sales/${s.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sales.data && (
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          Total: {sales.data.total} venta(s)
        </div>
      )}
    </div>
  );
}
