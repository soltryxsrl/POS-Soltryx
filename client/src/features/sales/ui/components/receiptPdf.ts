import jsPDF from 'jspdf';
import { formatMoney, formatQuantity } from '@/shared/lib/format';
import { paymentMethodLabel } from '@/features/payment-methods/application/hooks/use-payment-methods';
import type { Sale } from '../../domain/types';

const BUSINESS = {
  name: 'Soltryx',
  legalName: '',
  rnc: '',
  address: '',
  phone: '',
};

const PAGE_W = 80;
const MARGIN_X = 4;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FONT_SIZE = 8;
const LINE_H = 3.2;
const SEP_CHAR_W = CONTENT_W; // line goes edge to edge of content

function moneyNum(value: string | number): string {
  return formatMoney(value).replace('RD$', '').trim();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Estima la altura total (en mm) que va a ocupar el ticket — necesario porque
 * jsPDF requiere un alto fijo de página al crearla.
 */
function estimateHeight(sale: Sale): number {
  const isCancelled = sale.status === 'CANCELLED';
  const ncf = sale.fiscalDocumentId;
  const businessLines = [
    BUSINESS.name,
    BUSINESS.legalName,
    BUSINESS.rnc,
    BUSINESS.address,
    BUSINESS.phone,
  ].filter(Boolean).length;

  let lines = businessLines;
  lines += 1; // separador =
  lines += 1; // tipo de comprobante
  if (ncf) lines += 1;
  if (isCancelled) lines += 1;
  lines += 1; // sep -
  lines += 2; // No, Fecha/Hora
  if (isCancelled && sale.cancelledAt) lines += 1;
  if (isCancelled && sale.cancelReason) lines += 1;
  lines += 1; // sep -
  lines += 1; // header tabla
  lines += 1; // sep -
  for (const it of sale.items) {
    lines += 1;
    if (Number(it.quantity) !== 1) lines += 1;
  }
  lines += 1; // sep -
  lines += 1; // Subtotal
  if (Number(sale.discountTotal) > 0) lines += 1;
  lines += 1; // ITBIS
  lines += 1; // sep =
  lines += 1; // TOTAL
  lines += 1; // sep -
  lines += sale.payments.length;
  if (ncf) lines += 3;
  if (sale.notes) lines += 2;
  lines += 1; // sep =
  lines += 1; // gracias
  lines += 1; // devoluciones
  lines += 5; // espacio para corte

  return MARGIN_X * 2 + lines * LINE_H;
}

interface Cursor {
  doc: jsPDF;
  y: number;
}

function text(
  c: Cursor,
  s: string,
  opts: { align?: 'left' | 'center' | 'right'; bold?: boolean; size?: number } = {},
) {
  const { align = 'left', bold = false, size = FONT_SIZE } = opts;
  c.doc.setFont('courier', bold ? 'bold' : 'normal');
  c.doc.setFontSize(size);
  let x = MARGIN_X;
  if (align === 'center') x = PAGE_W / 2;
  else if (align === 'right') x = PAGE_W - MARGIN_X;
  c.doc.text(s, x, c.y, { align });
  c.y += LINE_H;
}

function lineRow(c: Cursor, label: string, value: string, bold = false) {
  c.doc.setFont('courier', bold ? 'bold' : 'normal');
  c.doc.setFontSize(FONT_SIZE);
  c.doc.text(label, MARGIN_X, c.y);
  c.doc.text(value, PAGE_W - MARGIN_X, c.y, { align: 'right' });
  c.y += LINE_H;
}

function sep(c: Cursor, char: '-' | '=') {
  c.doc.setFont('courier', 'normal');
  c.doc.setFontSize(FONT_SIZE);
  // Calcular cuántos caracteres caben en el ancho del contenido.
  const charW = c.doc.getTextWidth(char);
  const count = Math.max(1, Math.floor(SEP_CHAR_W / charW));
  c.doc.text(char.repeat(count), MARGIN_X, c.y);
  c.y += LINE_H * 0.6;
}

function itemRow(c: Cursor, qty: string, name: string, total: string) {
  c.doc.setFont('courier', 'normal');
  c.doc.setFontSize(FONT_SIZE);
  // Layout: qty (4ch) | name (flex) | total (right-aligned)
  c.doc.text(qty, MARGIN_X, c.y);
  // Truncate name to fit between qty and total
  const qtyW = 6; // ~4ch at this font
  const totalW = 16; // approx width of right column
  const nameX = MARGIN_X + qtyW;
  const nameMaxW = CONTENT_W - qtyW - totalW;
  const truncated = c.doc.splitTextToSize(name, nameMaxW)[0] ?? name;
  c.doc.text(truncated, nameX, c.y);
  c.doc.text(total, PAGE_W - MARGIN_X, c.y, { align: 'right' });
  c.y += LINE_H;
}

export function downloadReceiptPdf(
  sale: Sale,
  /** Nombres de formas de pago del catálogo (code→name) para reflejar renombres. */
  methodNames?: Record<string, string>,
) {
  const height = estimateHeight(sale);
  const doc = new jsPDF({
    unit: 'mm',
    format: [PAGE_W, Math.max(height, 60)],
    orientation: 'portrait',
  });

  const c: Cursor = { doc, y: MARGIN_X };
  const isCancelled = sale.status === 'CANCELLED';
  const ncf = sale.fiscalDocumentId;

  // Header
  text(c, BUSINESS.name, { align: 'center', bold: true, size: 10 });
  if (BUSINESS.legalName) text(c, BUSINESS.legalName, { align: 'center' });
  if (BUSINESS.rnc) text(c, `RNC: ${BUSINESS.rnc}`, { align: 'center' });
  if (BUSINESS.address) text(c, BUSINESS.address, { align: 'center' });
  if (BUSINESS.phone) text(c, `Tel: ${BUSINESS.phone}`, { align: 'center' });

  sep(c, '=');

  // Tipo de comprobante
  text(c, ncf ? 'FACTURA DE CONSUMO' : 'RECIBO NO FISCAL', {
    align: 'center',
    bold: true,
  });
  if (ncf) text(c, `NCF: ${ncf}`, { align: 'center' });
  if (isCancelled) {
    text(c, '*** VENTA ANULADA ***', { align: 'center', bold: true });
  }

  sep(c, '-');

  // Metadata
  text(c, `No.: ${sale.saleNumber}`);
  text(c, `Fecha: ${formatDate(sale.createdAt)} Hora: ${formatTime(sale.createdAt)}`);
  if (isCancelled && sale.cancelledAt) {
    text(c, `Anulada: ${formatDate(sale.cancelledAt)} ${formatTime(sale.cancelledAt)}`);
  }
  if (isCancelled && sale.cancelReason) {
    text(c, `Motivo: ${sale.cancelReason}`);
  }

  sep(c, '-');

  // Items header
  c.doc.setFont('courier', 'bold');
  c.doc.setFontSize(FONT_SIZE);
  c.doc.text('Cant', MARGIN_X, c.y);
  c.doc.text('Descripcion', MARGIN_X + 8, c.y);
  c.doc.text('Total', PAGE_W - MARGIN_X, c.y, { align: 'right' });
  c.y += LINE_H;

  sep(c, '-');

  // Items
  for (const it of sale.items) {
    const qty = formatQuantity(it.quantity);
    itemRow(c, qty, it.productNameSnapshot, moneyNum(it.total));
    if (Number(it.quantity) !== 1) {
      text(c, `@ ${moneyNum(it.unitPrice)} c/u`, { align: 'right' });
    }
  }

  sep(c, '-');

  // Totales
  lineRow(c, 'Subtotal:', moneyNum(sale.subtotal));
  if (Number(sale.discountTotal) > 0) {
    lineRow(c, 'Descuento:', `-${moneyNum(sale.discountTotal)}`);
  }
  lineRow(c, 'ITBIS 18%:', moneyNum(sale.taxTotal));
  sep(c, '=');
  lineRow(c, 'TOTAL RD$:', moneyNum(sale.total), true);

  sep(c, '-');

  // Pagos
  for (const p of sale.payments) {
    const label = `${paymentMethodLabel(p.method, methodNames)}${p.reference ? ` (${p.reference})` : ''}:`;
    lineRow(c, label, moneyNum(p.amount));
  }

  // NCF footer
  if (ncf) {
    sep(c, '-');
    text(c, `NCF: ${ncf}`, { align: 'center' });
    text(c, 'Documento valido como', { align: 'center', size: 7 });
    text(c, 'Comprobante Fiscal', { align: 'center', size: 7 });
  }

  // Notas
  if (sale.notes) {
    sep(c, '-');
    text(c, `Nota: ${sale.notes}`);
  }

  sep(c, '=');

  // Cierre
  text(c, '*** Gracias por su compra ***', { align: 'center', bold: true });
  text(c, 'Devoluciones: 3 dias con ticket', { align: 'center', size: 7 });

  doc.save(`recibo-${sale.saleNumber}.pdf`);
}
