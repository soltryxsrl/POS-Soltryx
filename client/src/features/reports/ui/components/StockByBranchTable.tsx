'use client';

import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { downloadCsv } from '@/shared/lib/csv';
import { downloadTablePdf, type PdfColumn } from '@/shared/lib/pdf';
import { formatQuantity } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Input } from '@/shared/ui/controls/Input';
import { reportsApiHttp } from '../../infrastructure/api/reports.api.http';
import { useStockByBranch } from '../../application/hooks/use-reports';

const PAGE = 50;
const EXPORT_LIMIT = 200;

/** Existencia comparativa por sucursal (matriz SKU × sucursal). Solo consolidado. */
export function StockByBranchTable() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<null | 'csv' | 'pdf'>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Debounce de la búsqueda (300ms) para no consultar por cada tecla.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search);
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = useStockByBranch({ q: q || undefined, limit: PAGE, offset });
  const d = query.data;
  const branches = d?.branches ?? [];
  const total = d?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.floor(offset / PAGE) + 1;

  const collect = async () => {
    const branchList = branches;
    const items: Array<{
      sku: string;
      name: string;
      categoryName: string | null;
      perBranch: Record<string, string>;
      totalStock: string;
    }> = [];
    let off = 0;
    let cols = branchList;
    for (let i = 0; i < 100; i++) {
      const res = await reportsApiHttp.stockByBranch({ q: q || undefined, limit: EXPORT_LIMIT, offset: off });
      if (res.branches.length) cols = res.branches;
      items.push(...res.items);
      off += EXPORT_LIMIT;
      if (res.items.length === 0 || off >= res.total) break;
    }
    return { cols, items };
  };

  const exportCsv = async () => {
    setBusy('csv');
    setExportError(null);
    try {
      const { cols, items } = await collect();
      const headers = ['SKU', 'Producto', 'Categoría', ...cols.map((b) => b.name), 'Total'];
      const rows = items.map((it) => [
        it.sku,
        it.name,
        it.categoryName ?? '',
        ...cols.map((b) => it.perBranch[b.id] ?? '0'),
        it.totalStock,
      ]);
      downloadCsv('existencia-por-sucursal.csv', headers, rows);
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
      const { cols, items } = await collect();
      const columns: PdfColumn[] = [
        { header: 'SKU', width: 14 },
        { header: 'Producto', width: 26 },
        ...cols.map((b) => ({ header: b.name, width: 12, align: 'right' as const })),
        { header: 'Total', width: 12, align: 'right' as const },
      ];
      const rows = items.map((it) => [
        it.sku,
        it.name,
        ...cols.map((b) => formatQuantity(it.perBranch[b.id] ?? '0')),
        formatQuantity(it.totalStock),
      ]);
      downloadTablePdf({
        filename: 'existencia-por-sucursal.pdf',
        title: 'Existencia por sucursal',
        subtitle: `${items.length} artículo(s) · ${cols.length} sucursal(es)`,
        columns,
        rows,
        orientation: 'landscape',
      });
    } catch (e) {
      setExportError(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const colCount = 3 + branches.length + 1;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
        <h3 className="text-sm font-medium">Existencia por sucursal</h3>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-56 text-xs"
          />
          <span className="text-xs text-muted-foreground">Exportar:</span>
          <button
            type="button"
            onClick={exportCsv}
            disabled={busy !== null || total === 0}
            title="Matriz completa en CSV (Excel)"
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {busy === 'csv' ? '...' : 'CSV'}
          </button>
          <button
            type="button"
            onClick={exportPdf}
            disabled={busy !== null || total === 0}
            title="Matriz imprimible (PDF)"
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
              <th className="px-3 py-2">Producto</th>
              {branches.map((b) => (
                <th key={b.id} className="px-3 py-2 text-right">
                  {b.name}
                </th>
              ))}
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr>
                <td colSpan={colCount} className="px-4 py-6 text-center text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            )}
            {query.isError && (
              <tr>
                <td colSpan={colCount} className="px-4 py-6 text-center text-destructive">
                  {getErrorMessage(query.error)}
                </td>
              </tr>
            )}
            {d?.items.length === 0 && !query.isLoading && (
              <tr>
                <td colSpan={colCount} className="px-4 py-6 text-center text-muted-foreground">
                  Sin productos.
                </td>
              </tr>
            )}
            {d?.items.map((it) => (
              <tr key={it.sku} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-xs text-muted-foreground">{it.sku}</div>
                </td>
                {branches.map((b) => {
                  const v = it.perBranch[b.id];
                  const zero = v === undefined || Number(v) === 0;
                  return (
                    <td
                      key={b.id}
                      className={`px-3 py-2 text-right ${
                        zero ? 'text-muted-foreground/50' : ''
                      }`}
                    >
                      {formatQuantity(v ?? '0')}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right font-medium">
                  {formatQuantity(it.totalStock)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > PAGE && (
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <span>
            {offset + 1}–{Math.min(offset + PAGE, total)} de {total} artículos
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
