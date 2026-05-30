'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Share2, Undo2 } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { useCancelSale, useSale } from '@/features/sales/application/hooks/use-sales';
import { useBusinessInfo } from '@/features/config/application/hooks/use-business-info';
import { useCustomer } from '@/features/customers/application/hooks/use-customers';
import { useReturnsForSale } from '@/features/returns/application/hooks/use-returns';
import { ReturnDialog } from '@/features/returns/ui/components/ReturnDialog';
import { PrintFormatPickerDialog } from '@/features/sales/ui/components/PrintFormatPickerDialog';
import { Receipt } from '@/features/sales/ui/components/Receipt';
import { ReceiptLetter } from '@/features/sales/ui/components/ReceiptLetter';
import { ShareReceiptDialog } from '@/features/sales/ui/components/ShareReceiptDialog';
import { printReceipt } from '@/features/sales/ui/components/printReceipt';
import { printReceiptLetter } from '@/features/sales/ui/components/printReceiptLetter';
import { downloadReceiptPdf } from '@/features/sales/ui/components/receiptPdf';
import { usePaymentMethods } from '@/features/payment-methods/application/hooks/use-payment-methods';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id;
  const sale = useSale(id);
  const business = useBusinessInfo();
  const paymentMethods = usePaymentMethods();
  const methodNames = Object.fromEntries(
    (paymentMethods.data ?? []).map((m) => [m.code, m.name]),
  );
  const cancel = useCancelSale();
  const { user } = useAuth();
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [autoPrinted, setAutoPrinted] = useState(false);

  const canCancel = !!user && (user.roles.includes('ADMIN') || user.roles.includes('MANAGER'));
  const canReturn = !!user && user.permissions.includes('returns.create');
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const receiptLetterRef = useRef<HTMLDivElement | null>(null);
  const wantsAutoPrint = searchParams?.get('print') === '1';
  const [showReturn, setShowReturn] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showPrintPicker, setShowPrintPicker] = useState(false);

  const handlePrint80mm = () => {
    const el = receiptRef.current?.querySelector('.receipt') ?? null;
    if (el) printReceipt(el);
  };
  const handlePrintLetter = () => {
    const el =
      receiptLetterRef.current?.querySelector('.receipt-letter') ?? null;
    if (el) printReceiptLetter(el);
  };
  const existingReturns = useReturnsForSale(id);
  const saleCustomerId = sale.data?.customerId ?? undefined;
  const saleCustomer = useCustomer(saleCustomerId);

  // Auto-imprime cuando se llega con ?print=1 (reprint desde el listado).
  // Esperamos a que `sale` y `business` resuelvan para que el ticket tenga
  // los datos completos al ir a la impresora.
  useEffect(() => {
    if (autoPrinted) return;
    if (!wantsAutoPrint) return;
    if (!sale.data) return;
    if (business.isLoading) return;
    const el = receiptRef.current?.querySelector('.receipt') ?? null;
    if (!el) return;
    printReceipt(el);
    setAutoPrinted(true);
  }, [autoPrinted, wantsAutoPrint, sale.data, business.isLoading]);

  if (sale.isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Cargando venta...</div>;
  }
  if (sale.isError || !sale.data) {
    return (
      <div className="space-y-3">
        <p className="text-destructive">{getErrorMessage(sale.error)}</p>
        <Link href="/sales" className="text-sm text-primary hover:underline">
          ← Volver a ventas
        </Link>
      </div>
    );
  }
  const s = sale.data;

  const onCancel = async () => {
    setError(null);
    try {
      await cancel.mutateAsync({ id: s.id, reason });
      setShowCancel(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/sales"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Ventas
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Venta {s.saleNumber}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => downloadReceiptPdf(s, methodNames)}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Descargar PDF
          </button>
          <button
            type="button"
            onClick={() => setShowPrintPicker(true)}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Imprimir
          </button>
          <button
            type="button"
            onClick={() => setShowShare(true)}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Share2 className="h-4 w-4" />
            Compartir
          </button>
          {canReturn && s.status === 'COMPLETED' && (
            <button
              type="button"
              onClick={() => setShowReturn(true)}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
              Devolución
            </button>
          )}
          {canCancel && s.status === 'COMPLETED' && (
            <button
              type="button"
              onClick={() => setShowCancel(true)}
              className="rounded-md bg-destructive px-3 py-1.5 text-sm text-destructive-foreground hover:bg-destructive/90"
            >
              Anular venta
            </button>
          )}
        </div>
      </div>

      <div ref={receiptRef}>
        <Receipt sale={s} />
      </div>

      {/* Versión Carta — fuera de pantalla, solo para que printReceiptLetter
          tenga DOM al que clonar. No la renderizamos visible porque el preview
          principal es la 80mm; cuando se elige Carta, el dialog imprime esto. */}
      <div
        ref={receiptLetterRef}
        aria-hidden
        style={{
          position: 'absolute',
          left: '-99999px',
          top: 0,
          width: '215.9mm',
        }}
      >
        <ReceiptLetter sale={s} />
      </div>

      {existingReturns.data && existingReturns.data.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Devoluciones de esta venta</h3>
          {(() => {
            // Si la venta tenía pagos en moneda extranjera, mostramos la tasa
            // que se usó para que el dueño sepa cómo entregar el reembolso si
            // el cliente quiere su efectivo en la misma moneda.
            const foreignPayments = s.payments.filter(
              (p) => p.currencyCode && p.currencyCode !== 'DOP' && p.exchangeRate,
            );
            const ratesByCurrency = new Map<string, string>();
            for (const p of foreignPayments) {
              if (p.currencyCode && p.exchangeRate) {
                ratesByCurrency.set(p.currencyCode, p.exchangeRate);
              }
            }
            if (ratesByCurrency.size === 0) return null;
            return (
              <div className="mb-2 rounded-md border border-dashed border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
                Esta venta tuvo pagos en moneda extranjera. Los reembolsos se
                muestran en DOP y su equivalente a la tasa del momento de la venta:
                {Array.from(ratesByCurrency.entries()).map(([cur, rate]) => (
                  <span key={cur} className="ml-2">
                    1 {cur} = {Number(rate).toFixed(2)} DOP
                  </span>
                ))}
              </div>
            );
          })()}
          <ul className="divide-y">
            {existingReturns.data.map((r) => {
              const foreignEquiv: Array<{ cur: string; amt: string }> = [];
              for (const p of s.payments) {
                if (p.currencyCode && p.currencyCode !== 'DOP' && p.exchangeRate) {
                  const rate = parseFloat(p.exchangeRate);
                  if (rate > 0) {
                    foreignEquiv.push({
                      cur: p.currencyCode,
                      amt: (parseFloat(r.total) / rate).toFixed(2),
                    });
                  }
                }
              }
              // De-dup por moneda
              const seen = new Set<string>();
              const dedup = foreignEquiv.filter((x) => {
                if (seen.has(x.cur)) return false;
                seen.add(x.cur);
                return true;
              });
              return (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">
                      {r.returnNumber}{' '}
                      <span className="text-xs text-muted-foreground">
                        · {r.items.length} ítem{r.items.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {r.refundMethod} · {r.reason ?? 'Sin motivo'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">RD$ {r.total}</div>
                    {dedup.length > 0 && (
                      <div className="text-[10px] text-muted-foreground">
                        equiv {dedup.map((x) => `${x.cur} ${x.amt}`).join(' · ')}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {showReturn && (
        <ReturnDialog
          saleId={s.id}
          saleNumber={s.saleNumber}
          saleHadAccountPayment={s.payments.some((p) => p.method === 'ACCOUNT')}
          saleHasCustomer={!!s.customerId}
          onClose={() => setShowReturn(false)}
        />
      )}

      {showShare && (
        <ShareReceiptDialog
          sale={s}
          businessName={business.data?.name}
          defaultPhone={saleCustomer.data?.phone ?? undefined}
          defaultEmail={saleCustomer.data?.email ?? undefined}
          onClose={() => setShowShare(false)}
        />
      )}

      {showCancel && (
        <MaintenanceShell
          open
          onClose={() => setShowCancel(false)}
          title={`Anular venta ${s.saleNumber}`}
          size="md"
        >
          <div className="space-y-4">
            <FormField label="Motivo" required>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={3}
                maxLength={255}
                placeholder="Ej: cliente devolvió, error del cajero..."
              />
            </FormField>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            )}

            <FormFooter>
              <Button
                variant="outline"
                onClick={() => setShowCancel(false)}
                disabled={cancel.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={onCancel}
                disabled={cancel.isPending || reason.length < 3}
              >
                {cancel.isPending ? 'Anulando...' : 'Confirmar anulación'}
              </Button>
            </FormFooter>
          </div>
        </MaintenanceShell>
      )}

      {showPrintPicker && (
        <PrintFormatPickerDialog
          saleNumber={s.saleNumber}
          onClose={() => setShowPrintPicker(false)}
          onPick80mm={handlePrint80mm}
          onPickLetter={handlePrintLetter}
        />
      )}
    </div>
  );
}
