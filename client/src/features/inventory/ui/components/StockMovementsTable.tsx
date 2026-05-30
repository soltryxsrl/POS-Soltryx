'use client';

import { formatDateTime, formatQuantity } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useStockMovements } from '../../application/hooks/use-inventory';

const TYPE_LABEL: Record<string, string> = {
  PURCHASE: 'Compra',
  SALE: 'Venta',
  RETURN: 'Devolución',
  ADJUSTMENT: 'Ajuste',
  CANCELLED_SALE: 'Venta anulada',
};

const TYPE_COLOR: Record<string, string> = {
  PURCHASE: 'bg-green-100 text-green-800',
  SALE: 'bg-red-100 text-red-800',
  RETURN: 'bg-blue-100 text-blue-800',
  ADJUSTMENT: 'bg-amber-100 text-amber-800',
  CANCELLED_SALE: 'bg-purple-100 text-purple-800',
};

export function StockMovementsTable({ productId }: { productId?: string }) {
  const movements = useStockMovements({ productId, limit: 100 });

  return (
    <div className="rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Fecha</th>
            <th className="px-4 py-2">Tipo</th>
            <th className="px-4 py-2 text-right">Cantidad</th>
            <th className="px-4 py-2 text-right">Stock antes</th>
            <th className="px-4 py-2 text-right">Stock después</th>
            <th className="px-4 py-2">Motivo</th>
          </tr>
        </thead>
        <tbody>
          {movements.isLoading && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                Cargando...
              </td>
            </tr>
          )}
          {movements.isError && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-destructive">
                {getErrorMessage(movements.error)}
              </td>
            </tr>
          )}
          {movements.data?.items.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                Sin movimientos.
              </td>
            </tr>
          )}
          {movements.data?.items.map((m) => {
            const positive = !m.quantity.startsWith('-');
            return (
              <tr key={m.id} className="border-b last:border-0">
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {formatDateTime(m.createdAt)}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${TYPE_COLOR[m.type] ?? ''}`}>
                    {TYPE_LABEL[m.type] ?? m.type}
                  </span>
                </td>
                <td
                  className={`px-4 py-2 text-right font-medium ${
                    positive ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {positive && !m.quantity.startsWith('+') ? '+' : ''}
                  {formatQuantity(m.quantity)}
                </td>
                <td className="px-4 py-2 text-right">{formatQuantity(m.previousStock)}</td>
                <td className="px-4 py-2 text-right">{formatQuantity(m.newStock)}</td>
                <td className="px-4 py-2 text-muted-foreground">{m.reason ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {movements.data && (
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          Total: {movements.data.total} movimiento(s)
        </div>
      )}
    </div>
  );
}
