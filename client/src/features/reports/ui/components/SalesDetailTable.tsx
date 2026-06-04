'use client';

import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { downloadCsv } from '@/shared/lib/csv';
import { downloadTablePdf, type PdfColumn } from '@/shared/lib/pdf';
import { formatDateTime, formatMoney, formatQuantity } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { reportsApiHttp } from '../../infrastructure/api/reports.api.http';
import { useSalesDetail } from '../../application/hooks/use-reports';
import type { SalesDetailLine } from '../../domain/types';
import { StatCard } from './StatCard';

const PAGE = 50;
const EXPORT_LIMIT = 200;

interface Props {
  from?: string;
  to?: string;
  branchId?: string;
}

const CSV_HEADERS = [
  'Fecha',
  'Venta',
  'NCF',
  'Cajero',
  'Producto',
  'SKU',
  'Variante',
  'Cantidad',
  'Precio',
  'Descuento',
  'Total',
  'Costo',
  'Margen',
];

// PDF: listado legible (omite NCF y SKU para que entre en una página A4 horizontal).
const PDF_COLUMNS: PdfColumn[] = [
  { header: 'Fecha', width: 18 },
  { header: 'Venta', width: 13 },
  { header: 'Cajero', width: 16 },
  { header: 'Producto', width: 30 },
  { header: 'Cant.', width: 9, align: 'right' },
  { header: 'Precio', width: 12, align: 'right' },
  { header: 'Total', width: 12, align: 'right' },
  { header: 'Costo', width: 12, align: 'right' },
  { header: 'Margen', width: 12, align: 'right' },
];

/** Detalle de ventas línea por línea, con totales del rango y exportación CSV. */
export function SalesDetailTable({ from, to, branchId }: Props) {
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<null | 'csv' | 'pdf'>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Al cambiar el rango/sucursal, volvemos a la primera página.
  useEffect(() => setOffset(0), [from, to, branchId]);

  const q = useSalesDetail({ from, to, branchId, limit: PAGE, offset });
  const d = q.data;
  const total = d?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.floor(offset / PAGE) + 1;

  /** Recorre todas las páginas del rango (tope defensivo de 20.000 líneas). */
  const collect = async (): Promise<SalesDetailLine[]> => {
    const out: SalesDetailLine[] = [];
    let off = 0;
    for (let i = 0; i < 100; i++) {
      const res = await reportsApiHttp.salesDetail({
        from,
        to,
        branchId,
        limit: EXPORT_LIMIT,
        offset: off,
      });
      out.push(...res.items);
      off += EXPORT_LIMIT;
      if (res.items.length === 0 || off >= res.total) break;
    }
    return out;
  };

  const exportCsv = async () => {
    setBusy('csv');
    setExportError(null);
    try {
      const lines = await collect();
      const rows = lines.map((it) => [
        formatDateTime(it.createdAt),
        it.saleNumber,
        it.ncf ?? '',
        it.cashier,
        it.productName,
        it.productSku,
        it.variantName ?? '',
        it.quantity,
        it.unitPrice,
        it.discount,
        it.total,
        it.unitCost,
        it.margin,
      ]);
      downloadCsv(`detalle-ventas_${from ?? ''}_a_${to ?? ''}.csv`, CSV_HEADERS, rows);
    } catch (e) {
      setExportError(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    setBusy('pdf');
    setExportError(null);
    try {
      const lines = await collect();
      const rows = lines.map((it) => [
        formatDateTime(it.createdAt),
        it.saleNumber,
        it.cashier,
        it.variantName ? `${it.productName} (${it.variantName})` : it.productName,
        formatQuantity(it.quantity),
        formatMoney(it.unitPrice),
        formatMoney(it.total),
        formatMoney(it.unitCost),
        formatMoney(it.margin),
      ]);
      downloadTablePdf({
        filename: `detalle-ventas_${from ?? ''}_a_${to ?? ''}.pdf`,
        title: 'Detalle de ventas',
        subtitle: `${from ?? ''} a ${to ?? ''} · ${lines.length} línea(s)`,
        columns: PDF_COLUMNS,
        rows,
      });
    } catch (e) {
      setExportError(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Líneas" value={d ? String(d.summary.lines) : '—'} />
        <StatCard label="Unidades" value={d ? formatQuantity(d.summary.units) : '—'} />
        <StatCard label="Ingresos" value={d ? formatMoney(d.summary.revenue) : '—'} />
        <StatCard label="Costo" value={d ? formatMoney(d.summary.cost) : '—'} />
        <StatCard label="Margen" value={d ? formatMoney(d.summary.margin) : '—'} tone="success" />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h3 className="text-sm font-medium">Detalle de ventas</h3>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Exportar:</span>
            <button
              type="button"
              onClick={exportCsv}
              disabled={busy !== null || total === 0}
              title="Detalle completo en CSV (Excel)"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {busy === 'csv' ? '...' : 'CSV'}
            </button>
            <button
              type="button"
              onClick={exportPdf}
              disabled={busy !== null || total === 0}
              title="Detalle imprimible (PDF)"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <FileText className="h-3.5 w-3.5" />
              {busy === 'pdf' ? '...' : 'PDF'}
            </button>
          </div>
        </div>

        {exportError && (
          <p className="px-4 py-2 text-xs text-destructive">{exportError}</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Venta</th>
                <th className="px-3 py-2">Cajero</th>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2 text-right">Cant.</th>
                <th className="px-3 py-2 text-right">Precio</th>
                <th className="px-3 py-2 text-right">Desc.</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Costo</th>
                <th className="px-3 py-2 text-right">Margen</th>
              </tr>
            </thead>
            <tbody>
              {q.isLoading && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-muted-foreground">
                    Cargando...
                  </td>
                </tr>
              )}
              {q.isError && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-destructive">
                    {getErrorMessage(q.error)}
                  </td>
                </tr>
              )}
              {d?.items.length === 0 && !q.isLoading && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-muted-foreground">
                    Sin ventas en el rango.
                  </td>
                </tr>
              )}
              {d?.items.map((it, i) => (
                <tr key={`${it.saleId}-${i}`} className="border-b last:border-0">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(it.createdAt)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="font-medium">{it.saleNumber}</div>
                    {it.ncf && (
                      <div className="text-xs text-muted-foreground">{it.ncf}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{it.cashier}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {it.productName}
                      {it.variantName && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({it.variantName})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{it.productSku}</div>
                  </td>
                  <td className="px-3 py-2 text-right">{formatQuantity(it.quantity)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(it.unitPrice)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {Number(it.discount) > 0 ? formatMoney(it.discount) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{formatMoney(it.total)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {formatMoney(it.unitCost)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-medium ${
                      Number(it.margin) < 0 ? 'text-destructive' : 'text-emerald-600'
                    }`}
                  >
                    {formatMoney(it.margin)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > PAGE && (
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <span>
              {offset + 1}–{Math.min(offset + PAGE, total)} de {total} líneas
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOffset(Math.max(0, offset - PAGE))}
                disabled={offset === 0}
                className="rounded-md border border-border/60 px-2 py-1 hover:bg-muted disabled:opacity-40"
              >
                Anterior
              </button>
              <span>
                {page} / {pages}
              </span>
              <button
                type="button"
                onClick={() => setOffset(offset + PAGE)}
                disabled={offset + PAGE >= total}
                className="rounded-md border border-border/60 px-2 py-1 hover:bg-muted disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
