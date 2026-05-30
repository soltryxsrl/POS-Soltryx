'use client';

import { formatMoney, formatQuantity } from '@/shared/lib/format';
import { useBusinessInfo } from '@/features/config/application/hooks/use-business-info';
import type { BusinessInfo } from '@/features/config/domain/types';
import { useCustomer } from '@/features/customers/application/hooks/use-customers';
import { usePaymentMethodLabel } from '@/features/payment-methods/application/hooks/use-payment-methods';
import type { Sale } from '../../domain/types';

// Defaults conservadores si la query aún no resolvió o el servidor no responde.
// La fuente real de verdad son los settings en la tabla business_settings.
const BUSINESS_FALLBACK: BusinessInfo = {
  name: 'T1ET POS',
  legalName: '',
  rnc: '',
  address: '',
  phone: '',
  footerNote: '*** Gracias por su compra ***',
  allowNegativeStock: false,
  priceIncludesTax: false,
  tipEnabled: false,
  tipDefaultPct: '10.00',
  taxRegime: 'ORDINARIO',
  discountOverrideThresholdPct: '15.00',
  logoUrl: null,
  tagline: null,
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function moneyNum(value: string | number): string {
  return formatMoney(value).replace('RD$', '').trim();
}

/** Nombre legible del tipo de comprobante por código DGII para el recibo. */
const DOC_TYPE_LABEL: Record<string, string> = {
  // e-CF
  E31: 'Factura de Crédito Fiscal Electrónica',
  E32: 'Factura de Consumo Electrónica',
  E33: 'Nota de Débito Electrónica',
  E34: 'Nota de Crédito Electrónica',
  E44: 'Régimen Especial Electrónico',
  E45: 'Comprobante Gubernamental Electrónico',
  // NCF tradicional
  B01: 'Factura de Crédito Fiscal',
  B02: 'Factura de Consumo',
  B03: 'Nota de Débito',
  B04: 'Nota de Crédito',
  B14: 'Comprobante Régimen Especial',
  B15: 'Comprobante Gubernamental',
  B16: 'Comprobante para Exportaciones',
};

export function Receipt({ sale }: { sale: Sale }) {
  const isCancelled = sale.status === 'CANCELLED';
  const fiscalDoc = sale.fiscalDocument;
  const isFiscal = !!fiscalDoc;
  const ncf = fiscalDoc?.ncf ?? null;
  const docTypeLabel = fiscalDoc
    ? DOC_TYPE_LABEL[fiscalDoc.docType] ?? fiscalDoc.docType
    : null;
  const business = useBusinessInfo().data ?? BUSINESS_FALLBACK;
  const labelOf = usePaymentMethodLabel();
  const customer = useCustomer(sale.customerId ?? undefined).data;
  const hasAccountPayment = sale.payments.some((p) => p.method === 'ACCOUNT');

  return (
    <>
      <PrintStyles />
      <div className="receipt mx-auto my-4 w-[80mm] bg-white p-4 font-mono text-[11px] leading-tight text-black shadow-md print:my-0 print:w-full print:p-0 print:shadow-none">
        {/* Header con logo opcional */}
        <div className="text-center">
          {business.logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={business.logoUrl}
              alt={business.name}
              className="logo mx-auto mb-1 max-h-16 object-contain"
            />
          )}
          <div className="text-base font-bold uppercase tracking-wide">
            {business.name}
          </div>
          {business.tagline && (
            <div className="text-[10px] italic">{business.tagline}</div>
          )}
          {business.legalName && <div>{business.legalName}</div>}
          {business.rnc && <div>RNC: {business.rnc}</div>}
          {business.address && <div>{business.address}</div>}
          {business.phone && <div>Tel: {business.phone}</div>}
        </div>

        <Sep char="=" />

        {/* Tipo de comprobante. ECF: para e-CF, NCF: para tradicional. */}
        <div className="text-center font-bold uppercase">
          {isFiscal && docTypeLabel ? docTypeLabel : 'Recibo no fiscal'}
        </div>
        {ncf && (
          <div className="text-center">
            {fiscalDoc?.docType.startsWith('E') ? 'ECF' : 'NCF'}: {ncf}
          </div>
        )}
        {fiscalDoc?.buyerRnc && (
          <div className="text-center">RNC Comprador: {fiscalDoc.buyerRnc}</div>
        )}
        {isCancelled && (
          <div className="my-1 border border-black px-1 py-0.5 text-center font-bold uppercase">
            *** Venta Anulada ***
          </div>
        )}

        <Sep char="-" />

        {/* Metadata */}
        <div>No.: {sale.saleNumber}</div>
        <div>
          Fecha: {formatDate(sale.createdAt)} Hora: {formatTime(sale.createdAt)}
        </div>
        {customer ? (
          <>
            <div className="break-words">Cliente: {customer.fullName}</div>
            {customer.document && (
              <div>
                {customer.documentType ?? 'Doc'}: {customer.document}
              </div>
            )}
          </>
        ) : isFiscal ? (
          // DGII: en facturas fiscales sin cliente asignado se imprime
          // "CLIENTE FINAL" con cédula de 11 ceros como placeholder estándar.
          <>
            <div>Cliente: CLIENTE FINAL</div>
            <div>Cédula: 00000000000</div>
          </>
        ) : null}
        {hasAccountPayment && (
          <div className="my-0.5 border border-black px-1 py-0.5 text-center font-bold uppercase">
            *** Venta a Crédito ***
          </div>
        )}
        {isCancelled && sale.cancelledAt && (
          <div className="italic">
            Anulada: {formatDate(sale.cancelledAt)} {formatTime(sale.cancelledAt)}
          </div>
        )}
        {isCancelled && sale.cancelReason && (
          <div className="italic">Motivo: {sale.cancelReason}</div>
        )}
        {sale.creditNoteFiscalDocument && (
          <div className="italic">
            Nota Crédito ({sale.creditNoteFiscalDocument.docType}):{' '}
            {sale.creditNoteFiscalDocument.ncf}
          </div>
        )}
        {sale.discountAuthorizedBySnapshot && (
          <div className="italic">
            Desc. autorizado por: {sale.discountAuthorizedBySnapshot}
          </div>
        )}

        <Sep char="-" />

        {/* Items */}
        <div
          className="grid font-bold"
          style={{ gridTemplateColumns: '4ch 1fr 9ch' }}
        >
          <span>Cant</span>
          <span className="px-1">Descripcion</span>
          <span className="text-right">Total</span>
        </div>
        <Sep char="-" />
        {sale.items.map((it) => {
          const qty = formatQuantity(it.quantity);
          const unitPrice = moneyNum(it.unitPrice);
          const lineTotal = moneyNum(it.total);
          const multi = Number(it.quantity) !== 1;
          return (
            <div key={it.id} className="mb-0.5">
              <div
                className="grid"
                style={{ gridTemplateColumns: '4ch 1fr 9ch' }}
              >
                <span>{qty}</span>
                <span className="break-words px-1">
                  {it.productNameSnapshot}
                </span>
                <span className="text-right">{lineTotal}</span>
              </div>
              {multi && (
                <div className="pl-[4ch] text-right opacity-75">
                  @ {unitPrice} c/u
                </div>
              )}
              {it.notes && (
                <div className="pl-[4ch] italic opacity-75 break-words">
                  &gt; {it.notes}
                </div>
              )}
            </div>
          );
        })}

        <Sep char="-" />

        {/* Totales */}
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
        <Line
          label="TOTAL RD$:"
          value={moneyNum(sale.total)}
          strong
        />

        <Sep char="-" />

        {/* Pago */}
        {sale.payments.map((p) => {
          const inForeign = p.currencyCode && p.currencyCode !== 'DOP';
          return (
            <div key={p.id}>
              <Line
                label={`${labelOf(p.method)}${p.reference ? ` (${p.reference})` : ''}:`}
                value={moneyNum(p.amount)}
              />
              {inForeign && p.foreignAmount && p.exchangeRate && (
                <div className="pl-2 text-[10px] opacity-75">
                  Pagado: {p.currencyCode} {Number(p.foreignAmount).toFixed(2)} @
                  {' '}{Number(p.exchangeRate).toFixed(2)}
                </div>
              )}
            </div>
          );
        })}

        {ncf && (
          <>
            <Sep char="-" />
            <div className="text-center">NCF: {ncf}</div>
            <div className="text-center text-[10px]">
              Documento valido como Comprobante Fiscal
            </div>
          </>
        )}

        {sale.notes && (
          <>
            <Sep char="-" />
            <div className="break-words">Nota: {sale.notes}</div>
          </>
        )}

        <Sep char="=" />

        {/* Cierre */}
        {business.footerNote && (
          <div className="text-center font-bold">{business.footerNote}</div>
        )}
        <div className="text-center text-[10px]">
          Devoluciones: 3 dias con ticket
        </div>

        {/* Espacio para el corte de la cuchilla */}
        <div className="h-10 print:h-16" />
      </div>
    </>
  );
}

function Sep({ char }: { char: '-' | '=' }) {
  return (
    <div
      aria-hidden
      className="my-0.5 select-none overflow-hidden whitespace-nowrap"
    >
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

function PrintStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@media print {
  /* Para impresoras térmicas (80mm). Las desktop ignoran esto y usan Letter/A4. */
  @page {
    size: 80mm auto;
    margin: 0;
  }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Oculta todo el chrome (sidebar, header, botones) pero preserva el layout. */
  body * {
    visibility: hidden !important;
  }

  .receipt, .receipt * {
    visibility: visible !important;
  }

  /* El ticket se posiciona absolutamente y se centra en la página.
     En térmicas 80mm queda pegado al borde; en Letter/A4 queda centrado. */
  .receipt {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    margin: 0 auto !important;
    width: 80mm !important;
    padding: 4mm !important;
    color: #000 !important;
    background: #fff !important;
    font-family: 'Courier New', Consolas, monospace !important;
    font-size: 11px !important;
    line-height: 1.25 !important;
    box-shadow: none !important;
    border: none !important;
  }
}
`,
      }}
    />
  );
}
