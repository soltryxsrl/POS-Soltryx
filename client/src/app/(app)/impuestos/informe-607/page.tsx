'use client';

import { useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { startOfMonthLocalISO, localDateISO } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { Input } from '@/shared/ui/controls/Input';
import { Switch } from '@/shared/ui/controls/Switch';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';
import { useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { useFiscal607 } from '@/features/fiscal/application/hooks/use-fiscal';
import { fiscalApiHttp } from '@/features/fiscal/infrastructure/api/fiscal.api.http';

export default function Informe607Page() {
  // Default: mes actual.
  const [from, setFrom] = useState(startOfMonthLocalISO());
  const [to, setTo] = useState(localDateISO());
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const canConsolidate = useHasPermission('branches.switch');
  const [allBranches, setAllBranches] = useState(false);
  const branchId = canConsolidate && allBranches ? 'all' : undefined;

  const report = useFiscal607({ from, to, branchId });

  const handleDownload = async () => {
    setDownloadError(null);
    setDownloading(true);
    try {
      await fiscalApiHttp.download607Txt(from, to, branchId);
    } catch (err) {
      setDownloadError(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  const rows = report.data?.rows ?? [];
  const summary = report.data?.summary;
  const hasRows = rows.length > 0;

  const fileName = useMemo(
    () => `607_${from.replace(/-/g, '')}_${to.replace(/-/g, '')}.txt`,
    [from, to],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Informe 607 — Ventas DGII"
        description="Reporte mensual de ventas con NCF. Selecciona el rango y descarga el archivo TXT en formato DGII."
        crumbs={[{ label: 'Impuestos' }]}
      />

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              Desde
            </label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              Hasta
            </label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-40"
            />
          </div>
          <Button onClick={handleDownload} disabled={!hasRows || downloading}>
            <Download className="h-4 w-4" />
            {downloading ? 'Descargando…' : `Descargar ${fileName}`}
          </Button>
          {canConsolidate && (
            <div className="ml-auto">
              <Switch
                checked={allBranches}
                onChange={setAllBranches}
                label="Todas las sucursales"
              />
            </div>
          )}
        </div>
        {downloadError && (
          <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {downloadError}
          </p>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Comprobantes" value={String(summary.totalRows)} />
          <SummaryCard
            label="Total Facturado"
            value={formatMoney(summary.totalFacturado)}
          />
          <SummaryCard label="ITBIS" value={formatMoney(summary.totalItbis)} />
          <SummaryCard
            label="Notas de Crédito"
            value={String(summary.notasCredito)}
            sub={
              summary.notasCredito > 0
                ? `Propina total: ${formatMoney(summary.totalPropina)}`
                : undefined
            }
          />
        </div>
      )}

      <div className="rounded-2xl border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Vista previa</h2>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {report.isFetching ? 'Cargando…' : `${rows.length} filas`}
          </span>
        </div>
        {report.isError && (
          <div className="px-4 py-6 text-sm text-destructive">
            {getErrorMessage(report.error)}
          </div>
        )}
        {!report.isError && !hasRows && !report.isFetching && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No hay comprobantes en el rango seleccionado.
          </div>
        )}
        {hasRows && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">NCF</th>
                  <th className="px-3 py-2 text-left">NCF Modif.</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">RNC/Cédula</th>
                  <th className="px-3 py-2 text-right">Subtotal</th>
                  <th className="px-3 py-2 text-right">ITBIS</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-center">Pago</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.ncf}
                    className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-2 font-mono">{r.docType}</td>
                    <td className="px-3 py-2 font-mono">{r.ncf}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {r.ncfModificado || '—'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.fechaComprobante.slice(0, 4)}-
                      {r.fechaComprobante.slice(4, 6)}-
                      {r.fechaComprobante.slice(6, 8)}
                    </td>
                    <td className="px-3 py-2">
                      {r.documento ? (
                        <>
                          <span className="text-[10px] text-muted-foreground">
                            {r.tipoIdentificacion === '1'
                              ? 'RNC'
                              : r.tipoIdentificacion === '2'
                                ? 'CED'
                                : ''}
                            {' '}
                          </span>
                          {r.documento}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Consumidor final</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(r.montoFacturado)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(r.itbisFacturado)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {formatMoney(r.total)}
                    </td>
                    <td className="px-3 py-2 text-center font-mono">
                      {r.formaPago}
                    </td>
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

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {sub && (
        <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
      )}
    </div>
  );
}
