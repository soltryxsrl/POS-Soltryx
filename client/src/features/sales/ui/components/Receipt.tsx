'use client';

import { formatDateTime, formatMoney, formatQuantity } from '@/shared/lib/format';
import type { Sale } from '../../domain/types';

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

export function Receipt({ sale }: { sale: Sale }) {
  const isCancelled = sale.status === 'CANCELLED';
  return (
    <div className="mx-auto max-w-md rounded-lg border bg-card p-6 print:border-0 print:shadow-none">
      <div className="text-center">
        <h1 className="text-xl font-semibold">T1ET POS</h1>
        <p className="mt-1 text-xs text-muted-foreground">Recibo no fiscal</p>
        {isCancelled && (
          <p className="mt-2 rounded-md bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive">
            VENTA ANULADA
          </p>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-1 text-xs">
        <dt className="text-muted-foreground">N°:</dt>
        <dd className="text-right font-mono">{sale.saleNumber}</dd>
        <dt className="text-muted-foreground">Fecha:</dt>
        <dd className="text-right">{formatDateTime(sale.createdAt)}</dd>
        {isCancelled && sale.cancelledAt && (
          <>
            <dt className="text-muted-foreground">Cancelada:</dt>
            <dd className="text-right">{formatDateTime(sale.cancelledAt)}</dd>
            <dt className="col-span-2 mt-1 italic">Motivo: {sale.cancelReason}</dt>
          </>
        )}
      </dl>

      <div className="my-4 border-t" />

      <table className="w-full text-xs">
        <thead className="border-b text-left text-muted-foreground">
          <tr>
            <th className="py-1">Producto</th>
            <th className="py-1 text-right">Cant.</th>
            <th className="py-1 text-right">Precio</th>
            <th className="py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((it) => (
            <tr key={it.id}>
              <td className="py-1">
                {it.productNameSnapshot}
                <br />
                <span className="text-muted-foreground">{it.productSkuSnapshot}</span>
              </td>
              <td className="py-1 text-right">{formatQuantity(it.quantity)}</td>
              <td className="py-1 text-right">{formatMoney(it.unitPrice)}</td>
              <td className="py-1 text-right">{formatMoney(it.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 space-y-1 border-t pt-3 text-sm">
        <Row label="Subtotal" value={formatMoney(sale.subtotal)} />
        {Number(sale.discountTotal) > 0 && (
          <Row label="Descuento" value={`−${formatMoney(sale.discountTotal)}`} />
        )}
        <Row label="ITBIS / Impuestos" value={formatMoney(sale.taxTotal)} />
        <div className="my-2 border-t" />
        <Row label="Total" value={formatMoney(sale.total)} strong />
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <p className="text-xs text-muted-foreground">Pagos:</p>
        {sale.payments.map((p) => (
          <Row
            key={p.id}
            label={`${METHOD_LABEL[p.method] ?? p.method}${p.reference ? ` (${p.reference})` : ''}`}
            value={formatMoney(p.amount)}
          />
        ))}
      </div>

      {sale.notes && (
        <p className="mt-4 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
          {sale.notes}
        </p>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">¡Gracias por su compra!</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'text-base font-semibold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
