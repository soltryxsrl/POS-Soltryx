import { formatQuantity } from '@/shared/lib/format';
import type { BusinessInfo } from '@/features/config/domain/types';
import type { Sale } from '@/features/sales/domain/types';
import {
  CUT,
  INIT,
  align,
  bold,
  feed,
  line,
  stripDiacritics,
  toBytes,
} from '../domain/escpos';

const WIDTH = 42;

/** Línea de 2 columnas (etiqueta izquierda, valor derecha) ajustada al ancho. */
function row(left: string, right: string): number[] {
  const l = stripDiacritics(left);
  const r = stripDiacritics(right);
  const gap = Math.max(1, WIDTH - l.length - r.length);
  return line(l + ' '.repeat(gap) + r);
}

function money(v: string | number): string {
  return Number(v).toFixed(2);
}

function dateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('es-DO')} ${d.toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

/**
 * Construye los bytes ESC/POS de un recibo a partir de la venta. Diseño básico
 * monoespaciado (no replica 1:1 el recibo visual). EXPERIMENTAL — sin verificar
 * contra hardware real.
 */
export function buildReceiptBytes(
  sale: Sale,
  business: BusinessInfo,
  label: (method: string) => string,
): Uint8Array {
  const parts: number[][] = [INIT];

  // Encabezado centrado.
  parts.push(align(1), bold(true), line(business.name), bold(false));
  if (business.rnc) parts.push(line(`RNC: ${business.rnc}`));
  if (business.address) parts.push(line(business.address));
  if (business.phone) parts.push(line(`Tel: ${business.phone}`));

  parts.push(line('='.repeat(WIDTH)));

  const fiscal = sale.fiscalDocument;
  if (fiscal) {
    const prefix = fiscal.docType.startsWith('E') ? 'ECF' : 'NCF';
    parts.push(line('COMPROBANTE FISCAL'), line(`${prefix}: ${fiscal.ncf}`));
    if (fiscal.buyerRnc) parts.push(line(`RNC: ${fiscal.buyerRnc}`));
  } else {
    parts.push(line('RECIBO NO FISCAL'));
  }

  // Metadata, alineada a la izquierda.
  parts.push(align(0), line(`No.: ${sale.saleNumber}`), line(`Fecha: ${dateTime(sale.createdAt)}`));
  parts.push(line('-'.repeat(WIDTH)));

  // Ítems.
  for (const it of sale.items) {
    parts.push(line(`${formatQuantity(it.quantity)} x ${it.productNameSnapshot}`));
    parts.push(row('', money(it.total)));
  }
  parts.push(line('-'.repeat(WIDTH)));

  // Totales.
  parts.push(row('Subtotal:', money(sale.subtotal)));
  if (Number(sale.discountTotal) > 0) {
    parts.push(row('Desc. lineas:', `-${money(sale.discountTotal)}`));
  }
  parts.push(row(sale.priceIncludesTax ? 'ITBIS incluido:' : 'ITBIS:', money(sale.taxTotal)));
  if (Number(sale.orderDiscount) > 0) {
    parts.push(row('Desc. orden:', `-${money(sale.orderDiscount)}`));
  }
  if (Number(sale.tipTotal) > 0) parts.push(row('Propina:', money(sale.tipTotal)));
  parts.push(line('='.repeat(WIDTH)), bold(true), row('TOTAL RD$:', money(sale.total)), bold(false));

  parts.push(line('-'.repeat(WIDTH)));
  for (const p of sale.payments) {
    parts.push(row(`${label(p.method)}:`, money(p.amount)));
  }

  // Cierre centrado.
  parts.push(align(1), feed(1));
  if (fiscal) parts.push(line('Documento valido como Comprobante Fiscal'));
  if (business.footerNote) parts.push(line(business.footerNote));
  parts.push(feed(3), CUT);

  return toBytes(...parts);
}
