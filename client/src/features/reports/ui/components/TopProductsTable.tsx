'use client';

import { formatMoney, formatQuantity } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useTopProducts } from '../../application/hooks/use-reports';

interface Props {
  from?: string;
  to?: string;
  limit?: number;
}

export function TopProductsTable({ from, to, limit = 10 }: Props) {
  const q = useTopProducts({ from, to, limit });

  return (
    <div className="rounded-lg border bg-card">
      <h3 className="border-b px-4 py-2 text-sm font-medium">Productos más vendidos</h3>
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">Producto</th>
            <th className="px-4 py-2 text-right">Unidades</th>
            <th className="px-4 py-2 text-right">Ingresos</th>
          </tr>
        </thead>
        <tbody>
          {q.isLoading && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                Cargando...
              </td>
            </tr>
          )}
          {q.isError && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-destructive">
                {getErrorMessage(q.error)}
              </td>
            </tr>
          )}
          {q.data?.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                Sin datos para este rango.
              </td>
            </tr>
          )}
          {q.data?.map((p, i) => (
            <tr key={p.productId} className="border-b last:border-0">
              <td className="px-4 py-2 text-xs text-muted-foreground">{i + 1}</td>
              <td className="px-4 py-2">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.sku}</div>
              </td>
              <td className="px-4 py-2 text-right">{formatQuantity(p.unitsSold)}</td>
              <td className="px-4 py-2 text-right font-medium">{formatMoney(p.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
