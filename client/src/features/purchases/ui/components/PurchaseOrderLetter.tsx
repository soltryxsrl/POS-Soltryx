'use client';

import { formatMoney, formatQuantity } from '@/shared/lib/format';
import type { BusinessInfo } from '@/features/config/domain/types';
import type { PurchaseOrder } from '../../domain/types';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CREDIT: 'Crédito',
  OTHER: 'Otro',
};

const BUSINESS_FALLBACK: BusinessInfo = {
  name: 'Soltryx',
  legalName: '',
  rnc: '',
  address: '',
  phone: '',
  footerNote: '',
  allowNegativeStock: false,
  priceIncludesTax: false,
  tipEnabled: false,
  tipDefaultPct: '10.00',
  taxRegime: 'ORDINARIO',
  discountOverrideThresholdPct: '15.00',
  logoUrl: null,
  tagline: null,
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })} ${d.toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })}`;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  // expectedDate / supplierInvoiceDate vienen como 'YYYY-MM-DD'; evitamos el
  // corrimiento de zona horaria parseando los componentes a mano.
  const [y, m, d] = value.split('-').map(Number);
  if (y && m && d) {
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }
  return new Date(value).toLocaleDateString('es-DO');
}

/**
 * Layout "orden de compra" en formato Carta (8.5 x 11) — espejo de
 * {@link ReceiptLetter} pero para una orden de compra a proveedor. Usa solo las
 * clases Tailwind que `printReceiptLetter` inyecta en el iframe de impresión, y
 * la clase raíz `.receipt-letter` para que ese mismo impresor lo reconozca.
 */
export function PurchaseOrderLetter({
  po,
  business = BUSINESS_FALLBACK,
}: {
  po: PurchaseOrder;
  business?: BusinessInfo;
}) {
  const isCancelled = po.status === 'CANCELLED';
  const hasRetentions = Number(po.itbisRetenido) > 0 || Number(po.isrRetenido) > 0;

  return (
    <div className="receipt-letter mx-auto bg-white p-8 text-black shadow-md print:my-0 print:p-0 print:shadow-none">
      {/* Banda superior: branding + título del documento */}
      <div className="flex items-start justify-between border-b-2 border-black pb-4">
        <div className="flex items-start gap-4">
          {business.logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={business.logoUrl}
              alt={business.name}
              className="h-20 w-20 object-contain"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight">{business.name}</h1>
            {business.tagline && (
              <p className="mt-0.5 text-sm italic text-gray-600">{business.tagline}</p>
            )}
            <div className="mt-1 text-xs text-gray-700">
              {business.legalName && <div>{business.legalName}</div>}
              {business.rnc && <div>RNC: {business.rnc}</div>}
              {business.address && <div>{business.address}</div>}
              {business.phone && <div>Tel: {business.phone}</div>}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-600">
            Orden de Compra
          </div>
          <div className="mt-1 text-3xl font-bold tabular-nums">{po.orderNumber}</div>
          <div className="mt-1 text-xs text-gray-700">{formatDateTime(po.createdAt)}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-600">
            {STATUS_LABEL[po.status] ?? po.status}
          </div>
        </div>
      </div>

      {isCancelled && (
        <div className="my-3 border-2 border-red-600 px-3 py-1.5 text-center font-bold uppercase text-red-700">
          *** Orden Anulada ***
          {po.cancelReason && (
            <div className="text-xs font-normal italic">Motivo: {po.cancelReason}</div>
          )}
        </div>
      )}

      {/* Bloque proveedor + datos de la orden */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Proveedor
          </div>
          <div className="mt-1 text-sm">
            <div className="font-semibold">{po.supplierName}</div>
            {po.supplierNcf && (
              <div className="text-xs text-gray-700">NCF: {po.supplierNcf}</div>
            )}
            {po.supplierInvoice && (
              <div className="text-xs text-gray-700">Factura: {po.supplierInvoice}</div>
            )}
            {po.supplierInvoiceDate && (
              <div className="text-xs text-gray-700">
                Fecha comprobante: {formatDate(po.supplierInvoiceDate)}
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Datos de la orden
          </div>
          <div className="mt-1 grid grid-cols-2 gap-y-1 text-xs">
            <div className="text-gray-600">No. orden:</div>
            <div className="font-mono">{po.orderNumber}</div>
            <div className="text-gray-600">Fecha:</div>
            <div>{formatDateTime(po.createdAt)}</div>
            {po.expectedDate && (
              <>
                <div className="text-gray-600">Fecha esperada:</div>
                <div>{formatDate(po.expectedDate)}</div>
              </>
            )}
            {po.paymentMethod && (
              <>
                <div className="text-gray-600">Forma de pago:</div>
                <div>{PAYMENT_METHOD_LABEL[po.paymentMethod] ?? po.paymentMethod}</div>
              </>
            )}
            <div className="text-gray-600">Estado:</div>
            <div className="font-semibold uppercase">
              {STATUS_LABEL[po.status] ?? po.status}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de líneas */}
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black text-[10px] font-semibold uppercase tracking-wider">
            <th className="py-2 text-left">Descripción</th>
            <th className="py-2 text-right">Pedido</th>
            <th className="py-2 text-right">Recibido</th>
            <th className="py-2 text-right">Costo unit</th>
            <th className="py-2 text-right">ITBIS</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {po.items.map((it) => (
            <tr key={it.id} className="border-b border-gray-300 align-top">
              <td className="py-1.5">
                <div className="font-medium">{it.productNameSnapshot}</div>
                <div className="text-[10px] text-gray-500">{it.productSkuSnapshot}</div>
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {formatQuantity(it.orderedQuantity)}
              </td>
              <td className="py-1.5 text-right tabular-nums text-gray-600">
                {formatQuantity(it.receivedQuantity)}
              </td>
              <td className="py-1.5 text-right tabular-nums">{formatMoney(it.unitCost)}</td>
              <td className="py-1.5 text-right tabular-nums text-gray-600">{it.taxRate}%</td>
              <td className="py-1.5 text-right font-medium tabular-nums">
                {formatMoney(it.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Bloque inferior: notas a la izquierda, totales a la derecha */}
      <div className="mt-4 grid grid-cols-2 gap-6">
        <div>
          {po.notes && (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Notas
              </div>
              <p className="mt-1 text-xs text-gray-700">{po.notes}</p>
            </>
          )}
        </div>

        <div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="tabular-nums">{formatMoney(po.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ITBIS</span>
              <span className="tabular-nums">{formatMoney(po.taxTotal)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t-2 border-black pt-2 text-lg font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(po.total)}</span>
            </div>
            {hasRetentions && (
              <div className="mt-2 border-t border-gray-300 pt-2 text-xs">
                {Number(po.itbisRetenido) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>ITBIS retenido</span>
                    <span className="tabular-nums">−{formatMoney(po.itbisRetenido)}</span>
                  </div>
                )}
                {Number(po.isrRetenido) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>ISR retenido</span>
                    <span className="tabular-nums">−{formatMoney(po.isrRetenido)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {business.footerNote && (
        <div className="mt-6 border-t border-gray-300 pt-4 text-center text-xs italic text-gray-600">
          {business.footerNote}
        </div>
      )}
    </div>
  );
}
