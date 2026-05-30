'use client';

import { formatMoney, formatQuantity } from '@/shared/lib/format';
import type { Sale } from '../../domain/types';

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

// Config del negocio — TODO: mover a settings/configuración del comercio.
const BUSINESS = {
  name: 'Soltryx POS',
  legalName: '',
  rnc: '',
  address: '',
  phone: '',
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

export function Receipt({ sale }: { sale: Sale }) {
  const isCancelled = sale.status === 'CANCELLED';
  const isFiscal = !!sale.fiscalDocumentId;
  const ncf = sale.fiscalDocumentId;

  return (
    <>
      <PrintStyles />
      <div className="receipt mx-auto my-4 w-[80mm] bg-white p-4 font-mono text-[11px] leading-tight text-black shadow-md print:my-0 print:w-full print:p-0 print:shadow-none">
        {/* Header */}
        <div className="text-center">
          <div className="text-base font-bold uppercase tracking-wide">
            {BUSINESS.name}
          </div>
          {BUSINESS.legalName && <div>{BUSINESS.legalName}</div>}
          {BUSINESS.rnc && <div>RNC: {BUSINESS.rnc}</div>}
          {BUSINESS.address && <div>{BUSINESS.address}</div>}
          {BUSINESS.phone && <div>Tel: {BUSINESS.phone}</div>}
        </div>

        <Sep char="=" />

        {/* Tipo de comprobante */}
        <div className="text-center font-bold uppercase">
          {isFiscal ? 'Factura de Consumo' : 'Recibo no fiscal'}
        </div>
        {ncf && <div className="text-center">NCF: {ncf}</div>}
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
        {isCancelled && sale.cancelledAt && (
          <div className="italic">
            Anulada: {formatDate(sale.cancelledAt)} {formatTime(sale.cancelledAt)}
          </div>
        )}
        {isCancelled && sale.cancelReason && (
          <div className="italic">Motivo: {sale.cancelReason}</div>
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
            </div>
          );
        })}

        <Sep char="-" />

        {/* Totales */}
        <Line label="Subtotal:" value={moneyNum(sale.subtotal)} />
        {Number(sale.discountTotal) > 0 && (
          <Line label="Descuento:" value={`-${moneyNum(sale.discountTotal)}`} />
        )}
        <Line label="ITBIS 18%:" value={moneyNum(sale.taxTotal)} />
        <Sep char="=" />
        <Line
          label="TOTAL RD$:"
          value={moneyNum(sale.total)}
          strong
        />

        <Sep char="-" />

        {/* Pago */}
        {sale.payments.map((p) => (
          <Line
            key={p.id}
            label={`${METHOD_LABEL[p.method] ?? p.method}${p.reference ? ` (${p.reference})` : ''}:`}
            value={moneyNum(p.amount)}
          />
        ))}

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
        <div className="text-center font-bold">
          *** Gracias por su compra ***
        </div>
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
