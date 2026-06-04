'use client';

import { useState } from 'react';
import { FileDown, FileText } from 'lucide-react';
import { downloadCsv } from '@/shared/lib/csv';
import { downloadTablePdf, type PdfColumn } from '@/shared/lib/pdf';
import { formatMoney, formatQuantity } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { productsApiHttp } from '../../infrastructure/api/products.api.http';
import type { ListProductsParams, Product } from '../../domain/types';

const PAGE = 200;

const CSV_HEADERS = [
  'SKU',
  'Código de barras',
  'Nombre',
  'Categoría',
  'Costo',
  'Precio',
  'ITBIS %',
  'Stock',
  'Mínimo',
  'Reorden',
  'Máximo',
  'Tipo',
  'Estado',
];

// El PDF es un listado de precios legible: omite código de barras y tipo.
const PDF_COLUMNS: PdfColumn[] = [
  { header: 'SKU', width: 14 },
  { header: 'Nombre', width: 30 },
  { header: 'Categoría', width: 16 },
  { header: 'Costo', width: 12, align: 'right' },
  { header: 'Precio', width: 12, align: 'right' },
  { header: 'ITBIS%', width: 9, align: 'right' },
  { header: 'Stock', width: 10, align: 'right' },
  { header: 'Mín', width: 9, align: 'right' },
  { header: 'Reorden', width: 10, align: 'right' },
  { header: 'Máx', width: 9, align: 'right' },
  { header: 'Estado', width: 11 },
];

function productType(p: Product): string {
  if (p.isKit) return 'Kit';
  if (p.hasVariants) return 'Con variantes';
  return 'Simple';
}

/**
 * Exporta el maestro de artículos/precios respetando los filtros activos de la
 * tabla. CSV (Excel, datos completos) o PDF (listado de precios imprimible).
 */
export function CatalogExportButton({ params }: { params: ListProductsParams }) {
  const [busy, setBusy] = useState<null | 'csv' | 'pdf'>(null);
  const [error, setError] = useState<string | null>(null);

  /** Recorre todas las páginas del catálogo (tope 20.000). */
  const collect = async (): Promise<Product[]> => {
    const out: Product[] = [];
    let offset = 0;
    for (let i = 0; i < 100; i++) {
      const res = await productsApiHttp.list({ ...params, limit: PAGE, offset });
      out.push(...res.items);
      offset += PAGE;
      if (res.items.length === 0 || offset >= res.total) break;
    }
    return out;
  };

  const stamp = () => new Date().toISOString().slice(0, 10);

  const exportCsv = async () => {
    setBusy('csv');
    setError(null);
    try {
      const products = await collect();
      const rows = products.map((p) => [
        p.sku,
        p.barcode ?? '',
        p.name,
        p.category?.name ?? '',
        p.costPrice,
        p.salePrice,
        p.taxRate,
        p.stock,
        p.minStock,
        p.reorderPoint,
        p.maxStock,
        productType(p),
        p.isActive ? 'Activo' : 'Inactivo',
      ]);
      downloadCsv(`maestro-articulos_${stamp()}.csv`, CSV_HEADERS, rows);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    setBusy('pdf');
    setError(null);
    try {
      const products = await collect();
      const rows = products.map((p) => [
        p.sku,
        p.name,
        p.category?.name ?? '—',
        formatMoney(p.costPrice),
        formatMoney(p.salePrice),
        `${Number(p.taxRate).toFixed(0)}%`,
        formatQuantity(p.stock),
        formatQuantity(p.minStock),
        formatQuantity(p.reorderPoint),
        formatQuantity(p.maxStock),
        p.isActive ? 'Activo' : 'Inactivo',
      ]);
      downloadTablePdf({
        filename: `maestro-articulos_${stamp()}.pdf`,
        title: 'Maestro de artículos y precios',
        subtitle: `${products.length} artículo(s) · generado ${stamp()}`,
        columns: PDF_COLUMNS,
        rows,
      });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Exportar:</span>
      <button
        type="button"
        onClick={exportCsv}
        disabled={busy !== null}
        title="Maestro completo en CSV (Excel)"
        className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        <FileDown className="h-3.5 w-3.5" />
        {busy === 'csv' ? '...' : 'CSV'}
      </button>
      <button
        type="button"
        onClick={exportPdf}
        disabled={busy !== null}
        title="Listado de precios imprimible (PDF)"
        className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        <FileText className="h-3.5 w-3.5" />
        {busy === 'pdf' ? '...' : 'PDF'}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
