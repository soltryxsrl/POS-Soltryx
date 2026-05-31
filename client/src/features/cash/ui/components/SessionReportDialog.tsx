'use client';

import { useRef } from 'react';
import { Printer } from 'lucide-react';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { useReceiptBusinessInfo } from '@/features/config/application/hooks/use-business-info';
import { usePaymentMethodLabel } from '@/features/payment-methods/application/hooks/use-payment-methods';
import { useCashRegisters, useSessionReport } from '../../application/hooks/use-cash';
import { RD_DENOMINATIONS } from '../../application/math/denominations';
import { printReportEl } from './printReport';

interface Props {
  sessionId: string;
  onClose: () => void;
}

export function SessionReportDialog({ sessionId, onClose }: Props) {
  const business = useReceiptBusinessInfo();
  const labelOf = usePaymentMethodLabel();
  const registers = useCashRegisters();
  const { user } = useAuth();
  const query = useSessionReport(sessionId);
  const ref = useRef<HTMLDivElement | null>(null);

  if (query.isLoading) {
    return (
      <MaintenanceShell open onClose={onClose} title="Reporte de turno" size="lg">
        <p className="py-8 text-center text-muted-foreground">Generando reporte...</p>
      </MaintenanceShell>
    );
  }
  if (query.isError || !query.data) {
    return (
      <MaintenanceShell open onClose={onClose} title="Reporte de turno" size="lg">
        <p className="text-destructive">{getErrorMessage(query.error)}</p>
      </MaintenanceShell>
    );
  }

  const r = query.data;
  const kindLabel = r.kind === 'X' ? 'Reporte X (intra-turno)' : 'Reporte Z (cierre)';
  // Nombre humano de la caja (en vez del primer 8 chars del UUID).
  const register = registers.data?.find((cr) => cr.id === r.session.cashRegisterId);
  const cajaLabel = register ? `${register.code} — ${register.name}` : r.session.cashRegisterId.slice(0, 8);

  return (
    <MaintenanceShell open onClose={onClose} title={kindLabel} size="lg">
      <div ref={ref}>
        <div className="report mx-auto w-[80mm] bg-white p-4 font-mono text-[11px] leading-tight text-black">
          {/* Header con logo opcional + tagline */}
          <div className="text-center">
            {business.data?.logoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={business.data.logoUrl}
                alt={business.data.name}
                className="logo mx-auto mb-1 max-h-14 object-contain"
              />
            )}
            <div className="text-base font-bold uppercase">
              {business.data?.name ?? 'Soltryx'}
            </div>
            {business.data?.tagline && (
              <div className="text-[10px] italic">{business.data.tagline}</div>
            )}
            {business.data?.rnc && <div>RNC: {business.data.rnc}</div>}
            {business.data?.address && <div>{business.data.address}</div>}
          </div>

          <Sep char="=" />
          <div className="text-center font-bold uppercase">{kindLabel}</div>
          <Sep char="-" />

          {/* Meta */}
          <Line label="Caja:" value={cajaLabel} />
          <Line label="Apertura:" value={formatDateTime(r.session.openedAt)} />
          {r.session.closedAt && (
            <Line label="Cierre:" value={formatDateTime(r.session.closedAt)} />
          )}
          <Line label="Cajero:" value={user?.fullName ?? user?.username ?? '—'} />
          <Line label="Generado:" value={formatDateTime(r.generatedAt)} />

          {/* === FONDO DE CAJA === */}
          <Sep char="-" />
          <SectionTitle>Conceptos de fondo de caja</SectionTitle>
          <Line label="Fondo inicial" value={moneyNum(r.openingAmount)} />
          {r.openingDenominations && Object.keys(r.openingDenominations).length > 0 && (
            <div className="pl-2 text-[10px] opacity-75">
              {denomToList(r.openingDenominations)}
            </div>
          )}
          <Line label="*** TOTAL FONDO ***" value={moneyNum(r.openingAmount)} strong />

          {/* === DECLARADO AL CIERRE (solo Z) === */}
          {r.countedAmount !== null && (
            <>
              <Sep char="-" />
              <SectionTitle>Conceptos declarados al cierre</SectionTitle>
              <Line label="Efectivo declarado" value={moneyNum(r.countedAmount)} />
              {r.closingDenominations && Object.keys(r.closingDenominations).length > 0 && (
                <div className="pl-2 text-[10px] opacity-75">
                  {denomToList(r.closingDenominations)}
                </div>
              )}
              <Line label="*** TOTAL DECLARADO ***" value={moneyNum(r.countedAmount)} strong />
            </>
          )}

          {/* === RESUMEN DE VENTAS === */}
          <Sep char="-" />
          <SectionTitle>Resumen de ventas</SectionTitle>
          <Line label={`Ventas (${r.salesCount})`} value={moneyNum(addMethodTotals(r.byMethod))} />
          {r.salesCancelled > 0 && (
            <Line label={`Anuladas (${r.salesCancelled})`} value="" />
          )}
          <Line label="Efectivo" value={moneyNum(r.cashSales)} />
          {Number(r.cashRefunds) > 0 && (
            <Line label="Devoluciones efectivo" value={`-${moneyNum(r.cashRefunds)}`} />
          )}
          <Line label="No-efectivo" value={moneyNum(r.nonCashSales)} />
          <Line label="ITBIS" value={moneyNum(r.taxTotal)} />
          {Number(r.discountTotal) > 0 && (
            <Line label="Descuentos" value={`-${moneyNum(r.discountTotal)}`} />
          )}
          <Line label="TOTAL SISTEMA" value={moneyNum(addMethodTotals(r.byMethod))} strong />

          {/* === CUADRE POR FORMA DE PAGO === */}
          <Sep char="-" />
          <SectionTitle>Cuadre por forma de pago</SectionTitle>
          {r.byMethod.length === 0 ? (
            <div className="opacity-75">Sin pagos</div>
          ) : (
            <>
              {/* Si hay declaración por método, mostramos 4 columnas:
                  Forma / Sist. / Decl. / Dif. Si no, solo Forma / Total. */}
              {r.byMethod.some((m) => m.declared !== null) ? (
                <>
                  <div
                    className="grid text-[10px] font-bold uppercase opacity-75"
                    style={{ gridTemplateColumns: '10ch 1fr 1fr 1fr' }}
                  >
                    <span>Forma</span>
                    <span className="text-right">Sist.</span>
                    <span className="text-right">Decl.</span>
                    <span className="text-right">Dif.</span>
                  </div>
                  {r.byMethod.map((m) => {
                    const diff = m.difference;
                    const diffNum = diff !== null ? Number(diff) : 0;
                    return (
                      <div
                        key={m.method}
                        className="grid text-[11px] tabular-nums"
                        style={{ gridTemplateColumns: '10ch 1fr 1fr 1fr' }}
                      >
                        <span className="truncate">
                          {labelOf(m.method)}
                        </span>
                        <span className="text-right">{moneyNum(m.total)}</span>
                        <span className="text-right">
                          {m.declared !== null ? moneyNum(m.declared) : '—'}
                        </span>
                        <span className="text-right">
                          {diff !== null
                            ? `${diffNum > 0 ? '+' : ''}${moneyNum(diff)}`
                            : '—'}
                        </span>
                      </div>
                    );
                  })}
                </>
              ) : (
                <>
                  <div className="flex justify-between text-[10px] font-bold uppercase opacity-75">
                    <span>Forma</span>
                    <span>Total</span>
                  </div>
                  {r.byMethod.map((m) => (
                    <Line
                      key={m.method}
                      label={`${labelOf(m.method)} (${m.count})`}
                      value={moneyNum(m.total)}
                    />
                  ))}
                </>
              )}
            </>
          )}

          {/* === MOVIMIENTOS (pay-in/out) si hay === */}
          {(Number(r.paidIns) > 0 || Number(r.paidOuts) > 0) && (
            <>
              <Sep char="-" />
              <SectionTitle>Movimientos de caja</SectionTitle>
              {Number(r.paidIns) > 0 && (
                <Line label="Entradas (pay-in)" value={`+${moneyNum(r.paidIns)}`} />
              )}
              {Number(r.paidOuts) > 0 && (
                <Line label="Salidas (pay-out)" value={`-${moneyNum(r.paidOuts)}`} />
              )}
              {r.movements.map((mv) => (
                <div key={mv.id} className="pl-2 text-[10px] opacity-75">
                  {mv.type === 'PAID_IN' ? '+' : '−'}
                  {moneyNum(mv.amount)} · {mv.reason}
                </div>
              ))}
            </>
          )}

          {/* === DIFERENCIA EFECTIVO (solo Z) === */}
          {r.countedAmount !== null && (
            <>
              <Sep char="-" />
              <Line label="Esperado efectivo" value={moneyNum(r.expectedAmount)} />
              <Line label="Contado efectivo" value={moneyNum(r.countedAmount)} />
              <Line
                label="DIFERENCIA EFE"
                value={
                  Number(r.difference ?? '0') === 0
                    ? '+0.00'
                    : `${Number(r.difference ?? '0') > 0 ? '+' : ''}${moneyNum(r.difference ?? '0.00')}`
                }
                strong
              />
            </>
          )}

          {/* === ITEMS VENDIDOS === */}
          {r.itemsSold.length > 0 && (
            <>
              <Sep char="-" />
              <SectionTitle>Items vendidos</SectionTitle>
              {r.itemsSold.map((it, idx) => (
                <div key={`${it.productSkuSnapshot}-${idx}`}>
                  <div className="break-words">{it.productNameSnapshot}</div>
                  <div className="flex justify-between pl-2 text-[10px] opacity-75">
                    <span>{Number(it.quantity).toFixed(2)} × {it.productSkuSnapshot}</span>
                    <span>{moneyNum(it.total)}</span>
                  </div>
                </div>
              ))}
              <Sep char="-" />
              <Line label="TOTAL ITEMS" value={moneyNum(sumItems(r.itemsSold))} strong />
            </>
          )}

          {/* === Notas de cierre === */}
          {r.session.notes && (
            <div className="mt-2 italic">{r.session.notes}</div>
          )}

          {/* === FIRMA CAJERO === */}
          <div className="h-10" />
          <div aria-hidden className="select-none">
            {'_'.repeat(28)}
          </div>
          <div className="text-center">Firma cajero</div>

          <Sep char="=" />
          <div className="text-center text-[10px] opacity-75">
            * Reporte interno — no es comprobante fiscal *
          </div>
          <div className="h-6" />
        </div>
      </div>

      <FormFooter>
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
        <Button onClick={() => printReportEl(ref.current?.querySelector('.report') ?? null)}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </FormFooter>
    </MaintenanceShell>
  );
}

function moneyNum(value: string | number): string {
  return formatMoney(value).replace('RD$', '').trim();
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center text-[10px] font-bold uppercase tracking-wider">
      {children}
    </div>
  );
}

/** Suma totales de byMethod (todos los métodos contribuyen al total sistema). */
function addMethodTotals(rows: Array<{ total: string }>): string {
  const cents = rows.reduce(
    (acc, r) => acc + Math.round(Number(r.total) * 100),
    0,
  );
  return (cents / 100).toFixed(2);
}

function sumItems(items: Array<{ total: string }>): string {
  const cents = items.reduce(
    (acc, it) => acc + Math.round(Number(it.total) * 100),
    0,
  );
  return (cents / 100).toFixed(2);
}

function denomToList(d: Record<string, number>): string {
  return Object.entries(d)
    .filter(([, c]) => c > 0)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([denom, c]) => {
      const denomDef = RD_DENOMINATIONS.find((x) => String(x.value) === denom);
      const label = denomDef?.label ?? denom;
      return `${c}×${label}`;
    })
    .join(' · ');
}

function Sep({ char }: { char: '-' | '=' }) {
  return (
    <div aria-hidden className="my-0.5 select-none overflow-hidden whitespace-nowrap">
      {char.repeat(42)}
    </div>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between ${strong ? 'text-base font-bold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
