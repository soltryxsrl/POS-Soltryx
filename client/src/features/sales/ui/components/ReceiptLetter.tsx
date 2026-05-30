'use client';

import { formatMoney, formatQuantity } from '@/shared/lib/format';
import { useBusinessInfo } from '@/features/config/application/hooks/use-business-info';
import type { BusinessInfo } from '@/features/config/domain/types';
import { useCustomer } from '@/features/customers/application/hooks/use-customers';
import { usePaymentMethodLabel } from '@/features/payment-methods/application/hooks/use-payment-methods';
import type { Sale } from '../../domain/types';

const DOC_TYPE_LABEL: Record<string, string> = {
  E31: 'Factura de Crédito Fiscal Electrónica',
  E32: 'Factura de Consumo Electrónica',
  E33: 'Nota de Débito Electrónica',
  E34: 'Nota de Crédito Electrónica',
  B01: 'Factura de Crédito Fiscal',
  B02: 'Factura de Consumo',
  B03: 'Nota de Débito',
  B04: 'Nota de Crédito',
  B14: 'Comprobante Régimen Especial',
  B15: 'Comprobante Gubernamental',
  B16: 'Comprobante para Exportaciones',
};

const BUSINESS_FALLBACK: BusinessInfo = {
  name: 'T1ET POS',
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

/**
 * Layout estilo "factura comercial" formato Carta (8.5 x 11). Pensado para
 * impresoras láser/inkjet de oficina (recepción, ventas a empresas). No es
 * monoespaciado — usa el font del sistema y deja margen generoso.
 */
export function ReceiptLetter({ sale }: { sale: Sale }) {
  const business = useBusinessInfo().data ?? BUSINESS_FALLBACK;
  const labelOf = usePaymentMethodLabel();
  const customer = useCustomer(sale.customerId ?? undefined).data;
  const fiscalDoc = sale.fiscalDocument;
  const ncfLabel = fiscalDoc
    ? fiscalDoc.docType.startsWith('E')
      ? 'ECF'
      : 'NCF'
    : null;
  const docTypeLabel = fiscalDoc
    ? DOC_TYPE_LABEL[fiscalDoc.docType] ?? fiscalDoc.docType
    : 'Recibo no fiscal';
  const isCancelled = sale.status === 'CANCELLED';
  const hasAccountPayment = sale.payments.some((p) => p.method === 'ACCOUNT');

  return (
    <div className="receipt-letter mx-auto bg-white p-8 text-black shadow-md print:my-0 print:p-0 print:shadow-none">
      {/* Banda superior: branding + título */}
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
            <h1 className="text-2xl font-bold uppercase tracking-tight">
              {business.name}
            </h1>
            {business.tagline && (
              <p className="mt-0.5 text-sm italic text-gray-600">
                {business.tagline}
              </p>
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
            {docTypeLabel}
          </div>
          <div className="mt-1 text-3xl font-bold tabular-nums">
            {sale.saleNumber}
          </div>
          {ncfLabel && fiscalDoc && (
            <div className="mt-1 text-sm font-mono">
              {ncfLabel}: {fiscalDoc.ncf}
            </div>
          )}
          <div className="mt-1 text-xs text-gray-700">
            {formatDateTime(sale.createdAt)}
          </div>
        </div>
      </div>

      {isCancelled && (
        <div className="my-3 border-2 border-red-600 px-3 py-1.5 text-center font-bold uppercase text-red-700">
          *** Venta Anulada ***
          {sale.cancelReason && (
            <div className="text-xs font-normal italic">
              Motivo: {sale.cancelReason}
            </div>
          )}
        </div>
      )}

      {/* Bloque cliente */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Cliente
          </div>
          {customer ? (
            <div className="mt-1 text-sm">
              <div className="font-semibold">{customer.fullName}</div>
              {customer.document && (
                <div className="text-xs text-gray-700">
                  {customer.documentType ?? 'Doc'}: {customer.document}
                </div>
              )}
              {customer.email && (
                <div className="text-xs text-gray-700">{customer.email}</div>
              )}
              {customer.phone && (
                <div className="text-xs text-gray-700">{customer.phone}</div>
              )}
            </div>
          ) : fiscalDoc ? (
            <div className="mt-1 text-sm">
              <div className="font-semibold">CLIENTE FINAL</div>
              <div className="text-xs text-gray-700">Cédula: 00000000000</div>
            </div>
          ) : (
            <div className="mt-1 text-sm text-gray-500">Sin cliente asignado</div>
          )}
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Información del comprobante
          </div>
          <div className="mt-1 grid grid-cols-2 gap-y-1 text-xs">
            <div className="text-gray-600">No. venta:</div>
            <div className="font-mono">{sale.saleNumber}</div>
            <div className="text-gray-600">Fecha:</div>
            <div>{formatDateTime(sale.createdAt)}</div>
            {fiscalDoc && (
              <>
                <div className="text-gray-600">{ncfLabel}:</div>
                <div className="font-mono">{fiscalDoc.ncf}</div>
                {fiscalDoc.buyerRnc && (
                  <>
                    <div className="text-gray-600">RNC comprador:</div>
                    <div>{fiscalDoc.buyerRnc}</div>
                  </>
                )}
              </>
            )}
            {hasAccountPayment && (
              <>
                <div className="text-gray-600">Tipo:</div>
                <div className="font-semibold uppercase text-amber-700">
                  Venta a crédito
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de items */}
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black text-[10px] font-semibold uppercase tracking-wider">
            <th className="py-2 text-left">Cant</th>
            <th className="py-2 text-left">Descripción</th>
            <th className="py-2 text-right">Precio</th>
            <th className="py-2 text-right">Desc.</th>
            <th className="py-2 text-right">ITBIS</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((it) => {
            const displayName = it.variantNameSnapshot
              ? `${it.productNameSnapshot} · ${it.variantNameSnapshot}`
              : it.productNameSnapshot;
            return (
              <tr key={it.id} className="border-b border-gray-300 align-top">
                <td className="py-1.5 tabular-nums">{formatQuantity(it.quantity)}</td>
                <td className="py-1.5">
                  <div className="font-medium">{displayName}</div>
                  <div className="text-[10px] text-gray-500">
                    {it.productSkuSnapshot}
                  </div>
                  {it.notes && (
                    <div className="mt-0.5 text-[10px] italic text-gray-600">
                      {it.notes}
                    </div>
                  )}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatMoney(it.unitPrice)}
                </td>
                <td className="py-1.5 text-right tabular-nums text-gray-600">
                  {Number(it.discount) > 0 ? `−${formatMoney(it.discount)}` : '—'}
                </td>
                <td className="py-1.5 text-right tabular-nums text-gray-600">
                  {formatMoney(it.taxTotal)}
                </td>
                <td className="py-1.5 text-right font-medium tabular-nums">
                  {formatMoney(it.total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Bloque inferior: pagos a la izquierda, totales a la derecha */}
      <div className="mt-4 grid grid-cols-2 gap-6">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Pagos
          </div>
          <div className="mt-1 space-y-1 text-xs">
            {sale.payments.map((p) => {
              const inForeign = p.currencyCode && p.currencyCode !== 'DOP';
              return (
                <div key={p.id} className="flex justify-between">
                  <span>
                    {labelOf(p.method)}
                    {p.reference ? ` (${p.reference})` : ''}
                    {inForeign && p.foreignAmount && p.exchangeRate && (
                      <span className="ml-1 text-[10px] text-gray-500">
                        {p.currencyCode} {Number(p.foreignAmount).toFixed(2)} @ {Number(p.exchangeRate).toFixed(2)}
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums">{formatMoney(p.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="tabular-nums">{formatMoney(sale.subtotal)}</span>
            </div>
            {Number(sale.discountTotal) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Descuento líneas</span>
                <span className="tabular-nums">
                  −{formatMoney(sale.discountTotal)}
                </span>
              </div>
            )}
            {Number(sale.orderDiscount) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Descuento orden</span>
                <span className="tabular-nums">
                  −{formatMoney(sale.orderDiscount)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">
                {sale.priceIncludesTax ? 'ITBIS incluido' : 'ITBIS'}
              </span>
              <span className="tabular-nums">{formatMoney(sale.taxTotal)}</span>
            </div>
            {Number(sale.tipTotal) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Propina</span>
                <span className="tabular-nums">{formatMoney(sale.tipTotal)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t-2 border-black pt-2 text-lg font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(sale.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {sale.discountAuthorizedBySnapshot && (
        <p className="mt-3 text-[10px] italic text-gray-600">
          Descuento autorizado por: {sale.discountAuthorizedBySnapshot}
        </p>
      )}

      {sale.creditNoteFiscalDocument && (
        <p className="mt-1 text-[10px] italic text-gray-600">
          Nota de crédito asociada: {sale.creditNoteFiscalDocument.docType}{' '}
          {sale.creditNoteFiscalDocument.ncf}
        </p>
      )}

      {business.footerNote && (
        <div className="mt-6 border-t border-gray-300 pt-4 text-center text-xs italic text-gray-600">
          {business.footerNote}
        </div>
      )}
    </div>
  );
}
