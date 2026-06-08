'use client';

import { useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { startOfMonthLocalISO, localDateISO } from '@/shared/lib/date';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { Input } from '@/shared/ui/controls/Input';
import { Switch } from '@/shared/ui/controls/Switch';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';
import { useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { useMultiBranch } from '@/features/plan/application/hooks/use-plan';
import { useFiscal608 } from '@/features/fiscal/application/hooks/use-fiscal';
import { fiscalApiHttp } from '@/features/fiscal/infrastructure/api/fiscal.api.http';

/** Etiquetas DGII del tipo de anulación (608). */
const TIPO_ANULACION: Record<string, string> = {
  '01': '01 Deterioro de factura',
  '02': '02 Errores de impresión',
  '03': '03 Impresión defectuosa',
  '04': '04 Duplicidad de factura',
  '05': '05 Corrección de información',
  '06': '06 Cambio de productos',
  '07': '07 Devolución de productos',
  '08': '08 Omisión de productos',
  '09': '09 Errores en secuencia NCF',
};

export default function Informe608Page() {
  const [from, setFrom] = useState(startOfMonthLocalISO());
  const [to, setTo] = useState(localDateISO());
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  // Consolidar (todas las sucursales) requiere el permiso Y multi-sucursal
  // habilitado; sin multi-sucursal el switch no aparece. Ambos hooks sin condición.
  const multiBranch = useMultiBranch();
  const canConsolidate = useHasPermission('branches.switch') && multiBranch;
  const [allBranches, setAllBranches] = useState(false);
  const branchId = canConsolidate && allBranches ? 'all' : undefined;

  const report = useFiscal608({ from, to, branchId });

  const handleDownload = async () => {
    setDownloadError(null);
    setDownloading(true);
    try {
      await fiscalApiHttp.download608Txt(from, to, branchId);
    } catch (err) {
      setDownloadError(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  const rows = report.data?.rows ?? [];
  const hasRows = rows.length > 0;
  const fileName = useMemo(
    () => `608_${from.replace(/-/g, '')}_${to.replace(/-/g, '')}.txt`,
    [from, to],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Informe 608 — Comprobantes Anulados"
        description="NCF anulados (quemados sin transacción) en el rango. Para anular un comprobante usa el botón en Comprobantes."
        crumbs={[{ label: 'Impuestos' }]}
      />

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Desde</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Hasta</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-40" />
          </div>
          <Button onClick={handleDownload} disabled={!hasRows || downloading}>
            <Download className="h-4 w-4" />
            {downloading ? 'Descargando…' : `Descargar ${fileName}`}
          </Button>
          {canConsolidate && (
            <div className="ml-auto">
              <Switch checked={allBranches} onChange={setAllBranches} label="Todas las sucursales" />
            </div>
          )}
        </div>
        {downloadError && (
          <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {downloadError}
          </p>
        )}
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Vista previa</h2>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {report.isFetching ? 'Cargando…' : `${rows.length} filas`}
          </span>
        </div>
        {report.isError && (
          <div className="px-4 py-6 text-sm text-destructive">{getErrorMessage(report.error)}</div>
        )}
        {!report.isError && !hasRows && !report.isFetching && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No hay comprobantes anulados en el rango.
          </div>
        )}
        {hasRows && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">NCF</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Fecha anulación</th>
                  <th className="px-3 py-2 text-left">Tipo de anulación</th>
                  <th className="px-3 py-2 text-left">Contraparte</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.ncf} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono">{r.ncf}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{r.docType}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.fechaAnulacion.slice(0, 4)}-{r.fechaAnulacion.slice(4, 6)}-{r.fechaAnulacion.slice(6, 8)}
                    </td>
                    <td className="px-3 py-2">{TIPO_ANULACION[r.tipoAnulacion] ?? r.tipoAnulacion}</td>
                    <td className="px-3 py-2">{r.buyerName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
