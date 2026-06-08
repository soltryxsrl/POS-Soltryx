'use client';

import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { downloadCsv } from '@/shared/lib/csv';
import { downloadTablePdf, type PdfColumn } from '@/shared/lib/pdf';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { reportsApiHttp } from '../../infrastructure/api/reports.api.http';
import { usePriceHistory } from '../../application/hooks/use-reports';
import type { PriceHistoryEntry } from '../../domain/types';

const PAGE = 50;
const EXPORT_LIMIT = 200;

interface Props {
  from?: string;
  to?: string;
  branchId?: string;
}

const FIELD_LABEL: Record<string, string> = {
  sale_price: 'Precio venta',
  cost_price: 'Precio costo',
};
const SOURCE_LABEL: Record<string, string> = {
  manual: 'Individual',
  bulk: 'Masivo',
};

const CSV_HEADERS = [
  'Fecha',
  'Producto',
  'SKU',
  'Variante',
  'Campo',
  'Antes',
  'Después',
  'Origen',
  'Usuario',
];

const PDF_COLUMNS: PdfColumn[] = [
  { header: 'Fecha', width: 18 },
  { header: 'Producto', width: 28 },
  { header: 'Campo', width: 14 },
  { header: 'Antes', width: 12, align: 'right' },
  { header: 'Después', width: 12, align: 'right' },
  { header: 'Origen', width: 10 },
  { header: 'Usuario', width: 16 },
];

const fieldLabel = (f: string) => FIELD_LABEL[f] ?? f;
const sourceLabel = (s: string) => SOURCE_LABEL[s] ?? s;

/** Historial de cambios de precio (auditoría) con paginación y export CSV/PDF. */
export function PriceHistoryTable({ from, to, branchId }: Props) {
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<null | 'csv' | 'pdf'>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => setOffset(0), [from, to, branchId]);

  const q = usePriceHistory({ from, to, branchId, limit: PAGE, offset });
  const d = q.data;
  const total = d?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.floor(offset / PAGE) + 1;

  const collect = async (): Promise<PriceHistoryEntry[]> => {
    const out: PriceHistoryEntry[] = [];
    let off = 0;
    for (let i = 0; i < 100; i++) {
      const res = await reportsApiHttp.priceHistory({
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
      const entries = await collect();
      const rows = entries.map((e) => [
        formatDateTime(e.createdAt),
        e.productName,
        e.productSku,
        e.variantName ?? '',
        fieldLabel(e.field),
        e.oldValue,
        e.newValue,
        sourceLabel(e.source),
        e.userName ?? '',
      ]);
      downloadCsv(`historial-precios_${from ?? ''}_a_${to ?? ''}.csv`, CSV_HEADERS, rows);
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
      const entries = await collect();
      const rows = entries.map((e) => [
        formatDateTime(e.createdAt),
        e.variantName ? `${e.productName} (${e.variantName})` : e.productName,
        fieldLabel(e.field),
        formatMoney(e.oldValue),
        formatMoney(e.newValue),
        sourceLabel(e.source),
        e.userName ?? '—',
      ]);
      downloadTablePdf({
        filename: `historial-precios_${from ?? ''}_a_${to ?? ''}.pdf`,
        title: 'Historial de cambios de precio',
        subtitle: `${from ?? ''} a ${to ?? ''} · ${entries.length} cambio(s)`,
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
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
        <h3 className="text-sm font-medium">Historial de cambios de precio</h3>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Exportar:</span>
          <button
            type="button"
            onClick={exportCsv}
            disabled={busy !== null || total === 0}
            title="Historial completo en CSV (Excel)"
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {busy === 'csv' ? '...' : 'CSV'}
          </button>
          <button
            type="button"
            onClick={exportPdf}
            disabled={busy !== null || total === 0}
            title="Historial imprimible (PDF)"
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <FileText className="h-3.5 w-3.5" />
            {busy === 'pdf' ? '...' : 'PDF'}
          </button>
        </div>
      </div>

      {exportError && <p className="px-4 py-2 text-xs text-destructive">{exportError}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2">Campo</th>
              <th className="px-3 py-2 text-right">Antes</th>
              <th className="px-3 py-2 text-right">Después</th>
              <th className="px-3 py-2">Origen</th>
              <th className="px-3 py-2">Usuario</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            )}
            {q.isError && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-destructive">
                  {getErrorMessage(q.error)}
                </td>
              </tr>
            )}
            {d?.items.length === 0 && !q.isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Sin cambios de precio en el rango.
                </td>
              </tr>
            )}
            {d?.items.map((e) => {
              const up = Number(e.newValue) > Number(e.oldValue);
              return (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(e.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {e.productName}
                      {e.variantName && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({e.variantName})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{e.productSku}</div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{fieldLabel(e.field)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {formatMoney(e.oldValue)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-medium ${
                      up ? 'text-emerald-600' : 'text-destructive'
                    }`}
                  >
                    {formatMoney(e.newValue)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {sourceLabel(e.source)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{e.userName ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > PAGE && (
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <span>
            {offset + 1}–{Math.min(offset + PAGE, total)} de {total} cambios
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
  );
}
