import jsPDF from 'jspdf';

/**
 * Generación de PDFs tabulares (cliente). jsPDF v4 sin plugin autotable: se
 * dibuja la tabla a mano con saltos de página, encabezado repetido y pie con
 * paginación. Pensado para reportes/listados exportables (maestro, ventas).
 */

export interface PdfColumn {
  header: string;
  /** Peso relativo del ancho de la columna (se normaliza al ancho útil). */
  width: number;
  align?: 'left' | 'right';
}

interface PdfTableOptions {
  filename: string;
  title: string;
  subtitle?: string;
  columns: PdfColumn[];
  rows: Array<Array<string | number>>;
  orientation?: 'portrait' | 'landscape';
}

const MARGIN = 10;
const ROW_H = 6;
const HEADER_H = 7;
const FOOTER_H = 8;
const PAD = 1.5;
const DATA_SIZE = 8;

export function downloadTablePdf(opts: PdfTableOptions): void {
  const orientation = opts.orientation ?? 'landscape';
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;

  const totalWeight = opts.columns.reduce((s, c) => s + c.width, 0) || 1;
  const colW = opts.columns.map((c) => (c.width / totalWeight) * contentW);
  const colX: number[] = [];
  let acc = MARGIN;
  for (const w of colW) {
    colX.push(acc);
    acc += w;
  }

  const cell = (text: string, x: number, w: number, y: number, align: 'left' | 'right') => {
    const fitted = doc.splitTextToSize(text, w - PAD * 2)[0] ?? '';
    if (align === 'right') doc.text(fitted, x + w - PAD, y, { align: 'right' });
    else doc.text(fitted, x + PAD, y, { align: 'left' });
  };

  const drawHeaderRow = (top: number): number => {
    doc.setFillColor(238, 240, 244);
    doc.rect(MARGIN, top, contentW, HEADER_H, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(DATA_SIZE);
    doc.setTextColor(40);
    const baseline = top + HEADER_H - 2;
    opts.columns.forEach((c, i) => {
      cell(c.header, colX[i], colW[i], baseline, c.align ?? 'left');
    });
    return top + HEADER_H;
  };

  let pageNo = 1;
  const drawFooter = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text(`Página ${pageNo}`, pageW - MARGIN, pageH - 4, { align: 'right' });
    doc.text(opts.title, MARGIN, pageH - 4, { align: 'left' });
  };

  // Título + subtítulo.
  let y = MARGIN + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20);
  doc.text(opts.title, MARGIN, y);
  y += 5;
  if (opts.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(opts.subtitle, MARGIN, y);
    y += 5;
  }
  doc.setTextColor(0);

  y = drawHeaderRow(y);

  for (let r = 0; r < opts.rows.length; r++) {
    if (y + ROW_H > pageH - FOOTER_H) {
      drawFooter();
      doc.addPage();
      pageNo += 1;
      y = MARGIN;
      y = drawHeaderRow(y);
    }
    // Zebra para legibilidad.
    if (r % 2 === 1) {
      doc.setFillColor(248, 249, 251);
      doc.rect(MARGIN, y, contentW, ROW_H, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(DATA_SIZE);
    doc.setTextColor(30);
    const baseline = y + ROW_H - 1.8;
    const row = opts.rows[r];
    opts.columns.forEach((c, i) => {
      cell(String(row[i] ?? ''), colX[i], colW[i], baseline, c.align ?? 'left');
    });
    y += ROW_H;
  }

  drawFooter();
  doc.save(opts.filename);
}
