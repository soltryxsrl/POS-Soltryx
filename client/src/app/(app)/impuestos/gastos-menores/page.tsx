'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatMoney } from '@/shared/lib/format';
import { Fab } from '@/shared/ui/controls/Fab';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';
import { useFiscalDocuments } from '@/features/fiscal/application/hooks/use-fiscal';
import { StandaloneDocFormDialog } from '@/features/fiscal/ui/components/StandaloneDocFormDialog';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function GastosMenoresPage() {
  const [showDialog, setShowDialog] = useState(false);
  const docsE43 = useFiscalDocuments({ docType: 'E43', limit: 20 });
  const docsB13 = useFiscalDocuments({ docType: 'B13', limit: 20 });
  const rows = [
    ...(docsE43.data?.items ?? []),
    ...(docsB13.data?.items ?? []),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Gastos menores"
        description="Combustible, parqueo, propinas a delivery y similares. Soltryx emite un E43 o B13 que entra al 606."
        crumbs={[{ label: 'Impuestos' }]}
      />

      <div className="rounded-2xl border bg-card">
        <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">
          Últimos gastos registrados
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aún no hay gastos menores registrados. Usa el botón{' '}
            <strong>Registrar gasto</strong> abajo a la derecha para empezar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">NCF</th>
                  <th className="px-3 py-2 text-left">Concepto</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2 font-mono">{r.docType}</td>
                    <td className="px-3 py-2 font-mono">{r.ncf}</td>
                    <td className="px-3 py-2">{r.buyerName ?? '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDate(r.issueDate)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {formatMoney(r.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Los gastos se incluyen automáticamente en{' '}
        <Link href="/impuestos/informe-606" className="underline">
          Informe 606
        </Link>{' '}
        bajo tipo de bienes/servicios &quot;11 - Gastos menores&quot;.
      </p>

      <Fab label="Registrar gasto" onClick={() => setShowDialog(true)} />

      {showDialog && (
        <StandaloneDocFormDialog
          title="Nuevo gasto menor"
          allowedTypes={['E43', 'B13']}
          counterpartyLabel="Concepto del gasto"
          showCounterpartyRnc={false}
          showTax={false}
          defaultTaxRate="0"
          onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}
