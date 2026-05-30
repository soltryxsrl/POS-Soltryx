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

export default function ProveedoresInformalesPage() {
  const [showDialog, setShowDialog] = useState(false);
  const docsE41 = useFiscalDocuments({ docType: 'E41', limit: 20 });
  const docsB11 = useFiscalDocuments({ docType: 'B11', limit: 20 });
  const rows = [
    ...(docsE41.data?.items ?? []),
    ...(docsB11.data?.items ?? []),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Compras a proveedores informales"
        description="Registra una compra a un proveedor sin NCF propio. T1ET emite un E41 o B11 desde su secuencia y la compra aparece en el 606."
        crumbs={[{ label: 'Impuestos' }]}
      />

      <div className="rounded-2xl border bg-card">
        <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">
          Últimos comprobantes emitidos
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aún no has registrado compras informales. Usa el botón{' '}
            <strong>Emitir comprobante</strong> abajo a la derecha para empezar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">NCF</th>
                  <th className="px-3 py-2 text-left">Proveedor</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2 font-mono">{r.docType}</td>
                    <td className="px-3 py-2 font-mono">{r.ncf}</td>
                    <td className="px-3 py-2">
                      <div>
                        <div className="font-medium">{r.buyerName ?? '—'}</div>
                        {r.buyerRnc && (
                          <div className="text-[10px] text-muted-foreground">
                            RNC: {r.buyerRnc}
                          </div>
                        )}
                      </div>
                    </td>
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
        Los E41/B11 emitidos también aparecen en{' '}
        <Link href="/impuestos/facturas" className="underline">
          /impuestos/facturas
        </Link>{' '}
        y se incluyen en el reporte{' '}
        <Link href="/impuestos/informe-606" className="underline">
          606
        </Link>
        .
      </p>

      <Fab label="Emitir comprobante" onClick={() => setShowDialog(true)} />

      {showDialog && (
        <StandaloneDocFormDialog
          title="Nueva compra a proveedor informal"
          allowedTypes={['E41', 'B11']}
          counterpartyLabel="Proveedor (nombre)"
          showCounterpartyRnc
          showTax
          defaultTaxRate="0"
          onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}
