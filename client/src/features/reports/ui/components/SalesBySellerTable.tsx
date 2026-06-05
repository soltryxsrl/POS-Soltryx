'use client';

import { formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useSalesBySeller } from '../../application/hooks/use-reports';

/** Ventas por vendedor (el usuario que registró la venta) — base de comisión. */
export function SalesBySellerTable({
  from,
  to,
  branchId,
}: {
  from?: string;
  to?: string;
  branchId?: string;
}) {
  const q = useSalesBySeller({ from, to, branchId });
  const rows = q.data ?? [];
  const grandTotal = rows.reduce((a, r) => a + Number(r.total), 0);

  return (
    <div className="rounded-lg border bg-card">
      <h3 className="border-b px-4 py-2 text-sm font-medium">Ventas por vendedor</h3>
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Vendedor</th>
            <th className="px-4 py-2 text-right">Ventas</th>
            <th className="px-4 py-2 text-right">Ticket prom.</th>
            <th className="px-4 py-2 text-right">Total vendido</th>
            <th className="px-4 py-2 text-right">% del total</th>
          </tr>
        </thead>
        <tbody>
          {q.isLoading && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                Cargando...
              </td>
            </tr>
          )}
          {q.isError && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-destructive">
                {getErrorMessage(q.error)}
              </td>
            </tr>
          )}
          {!q.isLoading && rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                Sin ventas en el rango.
              </td>
            </tr>
          )}
          {rows.map((r) => {
            const pct = grandTotal > 0 ? (Number(r.total) / grandTotal) * 100 : 0;
            return (
              <tr key={r.userId} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <div className="font-medium">{r.fullName || r.username}</div>
                  {r.fullName && (
                    <div className="text-xs text-muted-foreground">{r.username}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-right text-muted-foreground">{r.salesCount}</td>
                <td className="px-4 py-2 text-right text-muted-foreground">
                  {formatMoney(r.avgTicket)}
                </td>
                <td className="px-4 py-2 text-right font-medium">{formatMoney(r.total)}</td>
                <td className="px-4 py-2 text-right text-muted-foreground">{pct.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
