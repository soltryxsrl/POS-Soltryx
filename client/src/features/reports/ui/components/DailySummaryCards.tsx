'use client';

import { formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useDailySales } from '../../application/hooks/use-reports';
import { StatCard } from './StatCard';

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

export function DailySummaryCards({ date }: { date: string }) {
  const summary = useDailySales(date);

  if (summary.isLoading) {
    return <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">Cargando resumen...</div>;
  }
  if (summary.isError) {
    return <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{getErrorMessage(summary.error)}</div>;
  }
  if (!summary.data) return null;

  const d = summary.data;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total vendido" value={formatMoney(d.total)} tone="success" hint={`${d.salesCount} venta(s)`} />
        <StatCard label="ITBIS / Impuestos" value={formatMoney(d.taxTotal)} />
        <StatCard label="Descuentos" value={formatMoney(d.discountTotal)} />
        <StatCard
          label="Canceladas"
          value={d.cancelledCount}
          tone={d.cancelledCount > 0 ? 'warning' : 'default'}
          hint="Stock restituido"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card">
          <h3 className="border-b px-4 py-2 text-sm font-medium">Por método de pago</h3>
          <table className="w-full text-sm">
            <tbody>
              {d.byMethod.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-center text-muted-foreground">Sin movimientos.</td>
                </tr>
              )}
              {d.byMethod.map((m) => (
                <tr key={m.method} className="border-b last:border-0">
                  <td className="px-4 py-2">{METHOD_LABEL[m.method] ?? m.method}</td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {m.count} pago(s)
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{formatMoney(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border bg-card">
          <h3 className="border-b px-4 py-2 text-sm font-medium">Por cajero</h3>
          <table className="w-full text-sm">
            <tbody>
              {d.byUser.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-center text-muted-foreground">Sin ventas hoy.</td>
                </tr>
              )}
              {d.byUser.map((u) => (
                <tr key={u.userId} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <div className="font-medium">{u.fullName}</div>
                    <div className="text-xs text-muted-foreground">{u.username}</div>
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {u.salesCount} venta(s)
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{formatMoney(u.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
