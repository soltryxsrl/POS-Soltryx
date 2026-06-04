'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { downloadCsv } from '@/shared/lib/csv';
import { getErrorMessage } from '@/shared/lib/error-message';
import { productsApiHttp } from '../../infrastructure/api/products.api.http';
import type { ListProductsParams, Product } from '../../domain/types';

const PAGE = 200;

const HEADERS = [
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

function productType(p: Product): string {
  if (p.isKit) return 'Kit';
  if (p.hasVariants) return 'Con variantes';
  return 'Simple';
}

/**
 * Exporta el maestro de artículos/precios a CSV (Excel) respetando los filtros
 * activos de la tabla. Recorre todas las páginas del catálogo.
 */
export function CatalogExportButton({ params }: { params: ListProductsParams }) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      const rows: Array<Array<string | number>> = [];
      let offset = 0;
      // Tope defensivo: 100 páginas × 200 = 20.000 artículos.
      for (let i = 0; i < 100; i++) {
        const res = await productsApiHttp.list({ ...params, limit: PAGE, offset });
        for (const p of res.items) {
          rows.push([
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
        }
        offset += PAGE;
        if (res.items.length === 0 || offset >= res.total) break;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`maestro-articulos_${stamp}.csv`, HEADERS, rows);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={exportCsv}
        disabled={exporting}
        title="Exportar el maestro de artículos y precios (CSV/Excel) con los filtros actuales"
        className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        <FileDown className="h-3.5 w-3.5" />
        {exporting ? 'Exportando...' : 'Exportar maestro'}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
