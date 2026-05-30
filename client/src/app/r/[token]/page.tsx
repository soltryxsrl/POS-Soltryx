'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { http } from '@/shared/lib/http-client';
import { formatMoney, formatQuantity } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { printReceipt } from '@/features/sales/ui/components/printReceipt';

interface PublicReceipt {
  sale: {
    id: string;
    saleNumber: string;
    customerId: string | null;
    subtotal: string;
    discountTotal: string;
    orderDiscount: string;
    taxTotal: string;
    tipTotal: string;
    total: string;
    priceIncludesTax: boolean;
    status: string;
    fiscalStatus: string;
    fiscalDocumentId: string | null;
    notes: string | null;
    publicToken: string;
    createdAt: string;
    cancelledAt: string | null;
    cancelReason: string | null;
    items: Array<{
      id: string;
      productNameSnapshot: string;
      productSkuSnapshot: string;
      quantity: string;
      unitPrice: string;
      discount: string;
      taxRate: string;
      taxTotal: string;
      total: string;
    }>;
    payments: Array<{
      id: string;
      method: string;
      amount: string;
      reference: string | null;
    }>;
  };
  customer: {
    fullName: string;
    documentType: string | null;
    document: string | null;
  } | null;
  business: {
    name: string;
    legalName: string;
    rnc: string;
    address: string;
    phone: string;
    footerNote: string;
  };
  /** Nombres configurados de formas de pago (code→name) para reflejar renombres. */
  paymentMethodNames: Record<string, string>;
}

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  ACCOUNT: 'Crédito',
  OTHER: 'Otro',
};

export default function PublicReceiptPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [data, setData] = useState<PublicReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const receiptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    http<PublicReceipt>(`/public/sales/${token}`, { skipAuth: true, skipAuthRetry: true })
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
        <p className="text-sm text-slate-600">Cargando recibo...</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
        <div className="max-w-sm rounded-2xl border bg-white p-6 text-center shadow-md">
          <h1 className="text-lg font-semibold text-slate-900">
            Recibo no encontrado
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {error ?? 'El link puede estar mal o haber sido eliminado.'}
          </p>
        </div>
      </div>
    );
  }

  const { sale, customer, business, paymentMethodNames } = data;
  const methodLabel = (code: string): string =>
    paymentMethodNames?.[code] ?? METHOD_LABEL[code] ?? code;
  const isCancelled = sale.status === 'CANCELLED';
  const isFiscal = !!sale.fiscalDocumentId;
  const hasAccountPayment = sale.payments.some((p) => p.method === 'ACCOUNT');
  const date = new Date(sale.createdAt);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-6">
      <div className="mx-auto max-w-md space-y-4 px-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Recibo de <strong className="text-slate-900">{business.name}</strong>
          </div>
          <button
            type="button"
            onClick={() =>
              printReceipt(receiptRef.current?.querySelector('.receipt') ?? null)
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </button>
        </div>

        <div ref={receiptRef}>
          <div className="receipt mx-auto w-[80mm] bg-white p-4 font-mono text-[11px] leading-tight text-black shadow-md">
            {/* Header */}
            <div className="text-center">
              <div className="text-base font-bold uppercase tracking-wide">
                {business.name}
              </div>
              {business.legalName && <div>{business.legalName}</div>}
              {business.rnc && <div>RNC: {business.rnc}</div>}
              {business.address && <div>{business.address}</div>}
              {business.phone && <div>Tel: {business.phone}</div>}
            </div>

            <Sep char="=" />

            <div className="text-center font-bold uppercase">
              {isFiscal ? 'Factura de Consumo' : 'Recibo no fiscal'}
            </div>
            {sale.fiscalDocumentId && (
              <div className="text-center">NCF: {sale.fiscalDocumentId}</div>
            )}
            {isCancelled && (
              <div className="my-1 border border-black px-1 py-0.5 text-center font-bold uppercase">
                *** Venta Anulada ***
              </div>
            )}

            <Sep char="-" />

            <div>No.: {sale.saleNumber}</div>
            <div>
              Fecha: {date.toLocaleDateString('es-DO')} Hora:{' '}
              {date.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
            </div>
            {customer && (
              <>
                <div className="break-words">Cliente: {customer.fullName}</div>
                {customer.document && (
                  <div>
                    {customer.documentType ?? 'Doc'}: {customer.document}
                  </div>
                )}
              </>
            )}
            {hasAccountPayment && (
              <div className="my-0.5 border border-black px-1 py-0.5 text-center font-bold uppercase">
                *** Venta a Crédito ***
              </div>
            )}

            <Sep char="-" />

            <div className="grid font-bold" style={{ gridTemplateColumns: '4ch 1fr 9ch' }}>
              <span>Cant</span>
              <span className="px-1">Descripcion</span>
              <span className="text-right">Total</span>
            </div>
            <Sep char="-" />
            {sale.items.map((it) => {
              const qty = formatQuantity(it.quantity);
              const multi = Number(it.quantity) !== 1;
              return (
                <div key={it.id} className="mb-0.5">
                  <div className="grid" style={{ gridTemplateColumns: '4ch 1fr 9ch' }}>
                    <span>{qty}</span>
                    <span className="break-words px-1">{it.productNameSnapshot}</span>
                    <span className="text-right">{moneyNum(it.total)}</span>
                  </div>
                  {multi && (
                    <div className="pl-[4ch] text-right opacity-75">
                      @ {moneyNum(it.unitPrice)} c/u
                    </div>
                  )}
                </div>
              );
            })}

            <Sep char="-" />

            <Line label="Subtotal:" value={moneyNum(sale.subtotal)} />
            {Number(sale.discountTotal) > 0 && (
              <Line label="Desc. lineas:" value={`-${moneyNum(sale.discountTotal)}`} />
            )}
            <Line
              label={sale.priceIncludesTax ? 'ITBIS incluido:' : 'ITBIS:'}
              value={moneyNum(sale.taxTotal)}
            />
            {Number(sale.orderDiscount) > 0 && (
              <Line label="Desc. orden:" value={`-${moneyNum(sale.orderDiscount)}`} />
            )}
            {Number(sale.tipTotal) > 0 && (
              <Line label="Propina:" value={moneyNum(sale.tipTotal)} />
            )}
            <Sep char="=" />
            <Line label="TOTAL RD$:" value={moneyNum(sale.total)} strong />

            <Sep char="-" />

            {sale.payments.map((p) => (
              <Line
                key={p.id}
                label={`${methodLabel(p.method)}${p.reference ? ` (${p.reference})` : ''}:`}
                value={moneyNum(p.amount)}
              />
            ))}

            <Sep char="=" />

            {business.footerNote && (
              <div className="text-center font-bold">{business.footerNote}</div>
            )}
            <div className="text-center text-[10px]">
              Devoluciones: 3 dias con ticket
            </div>
            <div className="h-10" />
          </div>
        </div>
      </div>
    </div>
  );
}

function moneyNum(v: string | number): string {
  return formatMoney(v).replace('RD$', '').trim();
}

function Sep({ char }: { char: '-' | '=' }) {
  return (
    <div aria-hidden className="my-0.5 select-none overflow-hidden whitespace-nowrap">
      {char.repeat(42)}
    </div>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between ${strong ? 'text-base font-bold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
