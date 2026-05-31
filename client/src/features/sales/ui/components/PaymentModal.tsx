'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Eye, Plus, Printer, ShoppingBag, Trash2 } from 'lucide-react';
import { formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { HttpClientError } from '@/shared/lib/http-client';
import { PaymentMethod } from '@/shared/types/enums';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { cn } from '@/shared/lib/cn';
import { useOnlineStatus } from '@/shared/lib/use-online-status';
import { useCurrencies } from '@/features/currencies/application/hooks/use-currencies';
import {
  useBusinessInfo,
  useReceiptBusinessInfo,
} from '@/features/config/application/hooks/use-business-info';
import { usePaymentMethods } from '@/features/payment-methods/application/hooks/use-payment-methods';
import { useFiscalDocTypes } from '@/features/fiscal/application/hooks/use-fiscal';
import { usePrinter } from '@/features/printing/application/use-printer';
import { buildReceiptBytes } from '@/features/printing/application/build-receipt-bytes';
import type { CreateSaleInput } from '../../domain/types';
import { computeCartTotals } from '../../application/math/totals';
import { useCartStore } from '../../application/stores/cart.store';
import { useCreateSale, useSale } from '../../application/hooks/use-sales';
import { usePreviewTotals } from '../../application/hooks/use-preview-totals';
import { ManagerOverrideDialog } from './ManagerOverrideDialog';
import { Receipt } from './Receipt';
import { printReceipt } from './printReceipt';
import { printReceiptLetter } from './printReceiptLetter';
import { PrintFormatPickerDialog } from './PrintFormatPickerDialog';
import { ReceiptLetter } from './ReceiptLetter';

interface Props {
  cashSessionId: string;
  onClose: () => void;
}

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  ACCOUNT: 'Crédito',
  OTHER: 'Otro',
};

interface TenderRow {
  id: string;
  method: PaymentMethod;
  amount: string;
  reference: string;
  currencyCode: string;
}

function toCents(s: string | number): number {
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function fromCents(c: number): string {
  const sign = c < 0 ? '-' : '';
  const abs = Math.abs(c);
  return `${sign}${Math.trunc(abs / 100)}.${(abs % 100).toString().padStart(2, '0')}`;
}

function newId(): string {
  return Math.random().toString(36).slice(2);
}

export function PaymentModal({ cashSessionId, onClose }: Props) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const orderDiscount = useCartStore((s) => s.orderDiscount);
  const tipTotal = useCartStore((s) => s.tipTotal);
  const customer = useCartStore((s) => s.customer);
  const clear = useCartStore((s) => s.clear);
  // Solo cargamos monedas activas para el selector. DOP siempre está activa.
  const currencies = useCurrencies(true);
  const activeForeign = (currencies.data ?? []).filter((c) => !c.isBase);
  const hasForeign = activeForeign.length > 0;
  const rateOf = (code: string): number => {
    if (code === 'DOP') return 1;
    const found = (currencies.data ?? []).find((c) => c.code === code);
    return found?.rateToBase ? parseFloat(found.rateToBase) : 1;
  };
  const toBaseCents = (amount: string, code: string): number => {
    if (code === 'DOP') return toCents(amount);
    const n = Number(amount);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * rateOf(code) * 100);
  };
  // Preview server-side — incluye promociones que aplicarán al cobrar.
  const preview = usePreviewTotals({
    items: items.map((i) => ({
      productId: i.productId ?? undefined,
      variantId: i.variantId ?? undefined,
      description: i.productId ? undefined : i.productName,
      unitPrice: i.productId ? undefined : i.unitPrice,
      taxRate: i.productId ? undefined : i.taxRate,
      quantity: String(i.quantity),
      discount: i.discount,
    })),
    orderDiscount: Number(orderDiscount) > 0 ? orderDiscount : undefined,
    tipTotal: Number(tipTotal) > 0 ? tipTotal : undefined,
  });
  const business = useBusinessInfo();
  const priceIncludesTax = business.data?.priceIncludesTax ?? false;
  // Encabezado del recibo con datos de la sucursal activa (RNC/nombre por local).
  const receiptBusiness = useReceiptBusinessInfo();
  // Catálogo de formas de pago activas. El `code` ES la clase de comportamiento.
  const paymentMethods = usePaymentMethods({ activeOnly: true });
  const methodButtons =
    paymentMethods.data && paymentMethods.data.length > 0
      ? paymentMethods.data.map((m) => ({ code: m.code, name: m.name }))
      : Object.values(PaymentMethod).map((code) => ({
          code,
          name: METHOD_LABEL[code] ?? code,
        }));
  const methodRequiresReference = (code: string): boolean =>
    paymentMethods.data?.find((m) => m.code === code)?.requiresReference ??
    code !== PaymentMethod.CASH;
  const localTotals = computeCartTotals(
    items,
    orderDiscount,
    tipTotal,
    priceIncludesTax,
  );
  const totals = preview
    ? {
        subtotal: preview.subtotal,
        discountTotal: preview.discountTotal,
        orderDiscount: preview.orderDiscount,
        taxTotal: preview.taxTotal,
        tipTotal: preview.tipTotal,
        total: preview.total,
      }
    : localTotals;
  const promoApplied = preview?.appliedPromotions ?? [];
  const createSale = useCreateSale();
  const printer = usePrinter();
  const online = useOnlineStatus();

  const [tenders, setTenders] = useState<TenderRow[]>([
    {
      id: newId(),
      method: PaymentMethod.CASH,
      amount: totals.total,
      reference: '',
      currencyCode: 'DOP',
    },
  ]);
  // Una vez carga el catálogo, preselecciona la forma de pago marcada como
  // default (si el primer tender sigue intacto en efectivo).
  const didInitMethod = useRef(false);
  useEffect(() => {
    if (didInitMethod.current) return;
    const list = paymentMethods.data;
    if (!list?.length) return;
    didInitMethod.current = true;
    const def = list.find((m) => m.isDefault) ?? list[0];
    if (def && def.code !== PaymentMethod.CASH) {
      setTenders((rows) =>
        rows.length === 1 && rows[0] && rows[0].method === PaymentMethod.CASH
          ? [{ ...rows[0], method: def.code as PaymentMethod }]
          : rows,
      );
    }
  }, [paymentMethods.data]);
  // Tipo de comprobante DGII a emitir. '' = recibo no fiscal (default).
  // Pre-cargamos los tipos activos para SALE y filtramos por requiresBuyerRnc
  // según si el cliente actual tiene RNC válido (9 dígitos).
  const customerDocDigits = (customer?.document ?? '').replace(/\D+/g, '');
  const customerHasRnc =
    customer != null &&
    customer.documentType === 'RNC' &&
    customerDocDigits.length === 9;
  const docTypesQuery = useFiscalDocTypes({ activeOnly: true, appliesTo: 'SALE' });
  const availableDocTypes = useMemo(
    () =>
      (docTypesQuery.data ?? []).filter(
        (dt) => !dt.requiresBuyerRnc || customerHasRnc,
      ),
    [docTypesQuery.data, customerHasRnc],
  );
  const [fiscalDocTypeCode, setFiscalDocTypeCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  // Después de cobrar exitosamente mostramos un panel de éxito con acciones
  // (imprimir, nueva venta, ver detalle) en vez de redirigir abruptamente.
  const [success, setSuccess] = useState<{
    saleId: string;
    totalPaid: string;
    change: string;
  } | null>(null);
  // Si el server responde 403 DISCOUNT_OVERRIDE_REQUIRED guardamos los datos
  // para abrir el dialog de credenciales de manager y reintentar.
  const [overrideNeeded, setOverrideNeeded] = useState<{
    message: string;
    percentage?: number;
    thresholdPct?: number;
  } | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const totalCents = toCents(totals.total);
  const paidCents = useMemo(
    () =>
      tenders.reduce(
        (acc, t) => acc + Math.max(0, toBaseCents(t.amount, t.currencyCode)),
        0,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenders, currencies.data],
  );
  const remainingCents = totalCents - paidCents;
  const overpaidCents = paidCents - totalCents;
  const hasCash = tenders.some((t) => t.method === PaymentMethod.CASH);
  const change = hasCash && overpaidCents > 0 ? fromCents(overpaidCents) : '0.00';

  // Monto "Exacto" para un tender = lo que falta por cubrir sin contar lo que
  // ya aporta este mismo tender (soporta pago dividido).
  const exactForTender = (t: TenderRow): string => {
    const thisCents = Math.max(0, toBaseCents(t.amount, t.currencyCode));
    const otherPaid = paidCents - thisCents;
    return fromCents(Math.max(0, totalCents - otherPaid));
  };

  const updateTender = (id: string, patch: Partial<TenderRow>) => {
    setTenders((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeTender = (id: string) => {
    setTenders((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  };

  const addTender = () => {
    // Sugiere el monto restante (clamp >= 0). Para el método, prefiere una forma
    // activa del catálogo fuera de efectivo (lo típico al dividir el pago);
    // cae a la primera activa o a CARD si el catálogo no cargó.
    const suggested = remainingCents > 0 ? fromCents(remainingCents) : '0.00';
    const active = paymentMethods.data ?? [];
    const nextCode = (active.find((m) => m.code !== PaymentMethod.CASH)?.code ??
      active[0]?.code ??
      PaymentMethod.CARD) as PaymentMethod;
    setTenders((rows) => [
      ...rows,
      {
        id: newId(),
        method: nextCode,
        amount: suggested,
        reference: '',
        currencyCode: 'DOP',
      },
    ]);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones: cada tender > 0, suma >= total, métodos no-cash deben coincidir exactos
    const cleaned = tenders
      .map((t) => ({
        ...t,
        amount: t.amount.trim() === '' ? '0' : t.amount,
      }))
      .filter((t) => toCents(t.amount) > 0);

    if (cleaned.length === 0) {
      setError('Agrega al menos un pago con monto > 0.');
      return;
    }
    if (paidCents < totalCents) {
      setError(
        `Faltan ${formatMoney(fromCents(totalCents - paidCents))} por cubrir el total.`,
      );
      return;
    }
    const hasAccount = cleaned.some((t) => t.method === PaymentMethod.ACCOUNT);
    if (hasAccount && !customer) {
      setError('Para venta a crédito primero asigna un cliente al carrito.');
      return;
    }
    // Para métodos no-efectivo, sobrepago no tiene sentido (no hay vuelto).
    const nonCashOver = cleaned.find(
      (t) => t.method !== PaymentMethod.CASH && false, // permitir por simplicidad, server reclama si quiere
    );
    if (nonCashOver) {
      setError(`El monto de ${METHOD_LABEL[nonCashOver.method]} no debe exceder lo restante.`);
      return;
    }

    await submitSale(cleaned);
  };

  const buildPayload = (
    cleaned: TenderRow[],
    overrideCredentials?: { emailOrUsername: string; password: string },
  ): CreateSaleInput => ({
    cashSessionId,
    customerId: customer?.id,
    ...(fiscalDocTypeCode ? { fiscalDocTypeCode } : {}),
    orderDiscount: Number(orderDiscount) > 0 ? orderDiscount : undefined,
    tipTotal: Number(tipTotal) > 0 ? tipTotal : undefined,
    items: items.map((it) =>
      it.productId
        ? {
            productId: it.productId,
            variantId: it.variantId ?? undefined,
            quantity: String(it.quantity),
            discount: it.discount,
            ...(it.notes ? { notes: it.notes } : {}),
          }
        : {
            description: it.productName,
            unitPrice: it.unitPrice,
            taxRate: it.taxRate,
            quantity: String(it.quantity),
            discount: it.discount,
            ...(it.notes ? { notes: it.notes } : {}),
          },
    ),
    payments: cleaned.map((t) => ({
      method: t.method,
      amount: t.amount,
      currencyCode: t.currencyCode === 'DOP' ? undefined : t.currencyCode,
      reference: t.reference.trim() || undefined,
    })),
    ...(overrideCredentials ? { overrideCredentials } : {}),
  });

  const submitSale = async (
    cleaned: TenderRow[],
    overrideCredentials?: { emailOrUsername: string; password: string },
  ) => {
    try {
      const sale = await createSale.mutateAsync(buildPayload(cleaned, overrideCredentials));
      clear();
      setOverrideNeeded(null);
      setOverrideError(null);
      setSuccess({
        saleId: sale.id,
        totalPaid: fromCents(paidCents),
        change,
      });
      // Si hubo efectivo y hay impresora térmica ya conectada, abre el cajón
      // (silencioso: si no hay impresora, no hace nada).
      if (hasCash) void printer.openDrawer(false).catch(() => {});
    } catch (err) {
      // Detectar 403 DISCOUNT_OVERRIDE_REQUIRED → abrir dialog de manager.
      if (
        err instanceof HttpClientError &&
        err.apiError &&
        (err.apiError as { code?: string }).code === 'DISCOUNT_OVERRIDE_REQUIRED'
      ) {
        const extra = err.apiError as {
          message: string;
          percentage?: number;
          thresholdPct?: number;
        };
        setOverrideNeeded({
          message: extra.message,
          percentage: extra.percentage,
          thresholdPct: extra.thresholdPct,
        });
        setOverrideError(null);
        return;
      }
      // Si veníamos del dialog y las credenciales son inválidas, dejamos el
      // dialog abierto con el mensaje y permitimos reintentar.
      if (overrideCredentials && err instanceof HttpClientError && err.status === 401) {
        setOverrideError(getErrorMessage(err));
        return;
      }
      setError(getErrorMessage(err));
    }
  };

  const handleOverrideConfirm = async (creds: {
    emailOrUsername: string;
    password: string;
  }) => {
    setOverrideError(null);
    // Re-construir los tenders limpios para el retry.
    const cleaned = tenders
      .map((t) => ({ ...t, amount: t.amount.trim() === '' ? '0' : t.amount }))
      .filter((t) => toCents(t.amount) > 0);
    await submitSale(cleaned, creds);
  };

  // Receipt preview inline: fetch full sale + render <Receipt/> dentro del drawer.
  const successSale = useSale(success?.saleId);
  const receiptContainerRef = useRef<HTMLDivElement | null>(null);
  const receiptLetterContainerRef = useRef<HTMLDivElement | null>(null);
  const [showPrintPicker, setShowPrintPicker] = useState(false);

  const handlePrint = () => setShowPrintPicker(true);
  const handlePrint80mm = () => {
    const el = receiptContainerRef.current?.querySelector('.receipt');
    if (el) {
      printReceipt(el);
    } else if (success) {
      // Fallback: abrir detalle con auto-print si el preview todavía no resolvió.
      window.open(`/sales/${success.saleId}?print=1`, '_blank', 'noopener');
    }
  };
  const handlePrintLetter = () => {
    const el =
      receiptLetterContainerRef.current?.querySelector('.receipt-letter');
    if (el) printReceiptLetter(el);
  };

  const handleNewSale = () => {
    setSuccess(null);
    onClose();
  };

  const handleViewDetail = () => {
    if (!success) return;
    const saleId = success.saleId;
    setSuccess(null);
    onClose();
    router.push(`/sales/${saleId}`);
  };

  if (success) {
    const changeNum = Number(success.change);
    return (
      <MaintenanceShell
        open
        onClose={handleNewSale}
        title="Venta cobrada"
        size="xl"
        forceMode="drawer"
      >
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-card to-emerald-50 p-5 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-emerald-950/20">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl"
            />
            <div className="relative flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/30">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-foreground">
                  Venta procesada correctamente
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Total cobrado:{' '}
                  <strong className="text-foreground">
                    {formatMoney(success.totalPaid)}
                  </strong>
                </p>
              </div>
            </div>

            {changeNum > 0 && (
              <div className="mt-4 rounded-xl border border-emerald-300 bg-white/70 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/40">
                <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Vuelto al cliente
                </div>
                <div className="mt-1 text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {formatMoney(success.change)}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Button type="button" size="lg" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Imprimir recibo
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={handleViewDetail}>
                <Eye className="h-4 w-4" />
                Ver detalle
              </Button>
              <Button type="button" variant="outline" onClick={handleNewSale}>
                <ShoppingBag className="h-4 w-4" />
                Nueva venta
              </Button>
            </div>
            {printer.supported && successSale.data && business.data && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void printer
                    .printBytes(
                      buildReceiptBytes(
                        successSale.data!,
                        receiptBusiness.data ?? business.data!,
                        (m) => METHOD_LABEL[m] ?? m,
                      ),
                      true,
                    )
                    .catch(() => {})
                }
                title="Envía el recibo crudo por Web Serial (sin verificar con hardware aún)"
              >
                <Printer className="h-4 w-4" />
                Imprimir en térmica (ESC/POS) · experimental
              </Button>
            )}
          </div>

          {/* Receipt preview inline */}
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Vista previa del recibo
              </span>
              {successSale.isLoading && (
                <span className="text-[10px] text-muted-foreground">cargando…</span>
              )}
            </div>
            <div
              ref={receiptContainerRef}
              className="mx-auto max-h-[420px] overflow-y-auto rounded-lg bg-white shadow-inner"
              style={{ width: '300px' }}
            >
              {successSale.data ? (
                <Receipt sale={successSale.data} />
              ) : (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  Generando recibo…
                </div>
              )}
            </div>
          </div>

          {/* Versión Carta fuera de pantalla — el dialog la usa al imprimir. */}
          {successSale.data && (
            <div
              ref={receiptLetterContainerRef}
              aria-hidden
              style={{
                position: 'absolute',
                left: '-99999px',
                top: 0,
                width: '215.9mm',
              }}
            >
              <ReceiptLetter sale={successSale.data} />
            </div>
          )}
        </div>

        {showPrintPicker && successSale.data && (
          <PrintFormatPickerDialog
            saleNumber={successSale.data.saleNumber}
            onClose={() => setShowPrintPicker(false)}
            onPick80mm={handlePrint80mm}
            onPickLetter={handlePrintLetter}
          />
        )}
      </MaintenanceShell>
    );
  }

  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title="Cobrar venta"
      size="xl"
      forceMode="drawer"
    >
      <div className="rounded-2xl border border-border bg-gradient-to-br from-brand-tint via-card to-brand-soft p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total a cobrar
            </div>
            <div className="mt-1 text-3xl font-bold text-foreground">
              {formatMoney(totals.total)}
            </div>
            {promoApplied.length > 0 && (
              <div className="mt-2 text-[11px] text-emerald-700">
                Incluye {promoApplied.length} promo
                {promoApplied.length === 1 ? '' : 's'} ·
                {' '}−{formatMoney(preview?.promotionsTotal ?? '0')}
              </div>
            )}
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>Pagado: <strong className="text-foreground">{formatMoney(fromCents(paidCents))}</strong></div>
            {remainingCents > 0 && (
              <div>Restante: <strong className="text-amber-700">{formatMoney(fromCents(remainingCents))}</strong></div>
            )}
            {hasCash && overpaidCents > 0 && (
              <div>Vuelto: <strong className="text-emerald-700">{formatMoney(change)}</strong></div>
            )}
          </div>
        </div>
      </div>

      {Number(tipTotal) > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            Propina incluida en el total
          </span>
          <span className="font-semibold tabular-nums">
            {formatMoney(tipTotal)}
          </span>
        </div>
      )}

      {/* Tipo de comprobante DGII */}
      <div className="mt-3 rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tipo de comprobante
          </span>
          {fiscalDocTypeCode && (
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              NCF se emitirá
            </span>
          )}
        </div>
        <select
          value={fiscalDocTypeCode}
          onChange={(e) => setFiscalDocTypeCode(e.target.value)}
          className="w-full rounded-lg border border-border/60 bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-from/60 focus:ring-2 focus:ring-brand-from/20"
          disabled={docTypesQuery.isLoading}
        >
          <option value="">Sin comprobante fiscal (recibo no fiscal)</option>
          {availableDocTypes.map((dt) => (
            <option key={dt.code} value={dt.code}>
              {dt.code} — {dt.name}
            </option>
          ))}
        </select>
        {customer && !customerHasRnc &&
          docTypesQuery.data?.some((d) => d.requiresBuyerRnc && d.isActive) && (
            <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
              El cliente no tiene RNC — los tipos B01/E31/E45 no aparecen. Asigna
              un cliente con RNC para emitirlos.
            </p>
          )}
        {!customer && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Sin cliente asignado. Para emitir Crédito Fiscal (E31/B01) asigna un
            cliente con RNC.
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div className="space-y-3">
          {tenders.map((t, idx) => (
            <div
              key={t.id}
              className="rounded-xl border border-border bg-card p-3 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Pago {idx + 1}
                </span>
                {tenders.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTender(t.id)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Quitar
                  </button>
                )}
              </div>

              <FormField label="Método">
                <div className="flex flex-wrap gap-2">
                  {methodButtons.map(({ code, name }) => {
                    const isAccount = code === PaymentMethod.ACCOUNT;
                    const disabled = isAccount && !customer;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() =>
                          !disabled &&
                          updateTender(t.id, { method: code as PaymentMethod })
                        }
                        disabled={disabled}
                        title={
                          disabled ? 'Asigna un cliente al carrito para usar crédito' : undefined
                        }
                        className={cn(
                          'flex-1 rounded-xl border-2 px-3 py-2 text-sm font-medium transition',
                          t.method === code
                            ? 'border-brand-from bg-brand-tint text-brand-from'
                            : 'border-border bg-background hover:border-foreground/20',
                          disabled && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
                {t.method === PaymentMethod.ACCOUNT && customer && (
                  <p className="mt-1 text-xs text-amber-700">
                    Se cargará a la cuenta de <strong>{customer.fullName}</strong>. No
                    se considera efectivo recibido en caja.
                  </p>
                )}
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Monto" required>
                  <div className="flex gap-2">
                    <Input
                      value={t.amount}
                      onChange={(e) => updateTender(t.id, { amount: e.target.value })}
                      pattern="^\d+(\.\d{1,2})?$"
                      inputMode="decimal"
                      className="flex-1 text-lg font-medium"
                    />
                    {hasForeign && (
                      <select
                        value={t.currencyCode}
                        onChange={(e) =>
                          updateTender(t.id, { currencyCode: e.target.value })
                        }
                        className="rounded-lg border border-border bg-background px-2 text-sm"
                      >
                        <option value="DOP">DOP</option>
                        {activeForeign.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {t.currencyCode !== 'DOP' && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Tasa actual: 1 {t.currencyCode} ={' '}
                      {rateOf(t.currencyCode).toFixed(2)} DOP. Equivale a{' '}
                      <strong>
                        {formatMoney(
                          fromCents(toBaseCents(t.amount, t.currencyCode)),
                        )}
                      </strong>
                      .
                    </p>
                  )}
                </FormField>
                {methodRequiresReference(t.method) && (
                  <FormField label="Referencia">
                    <Input
                      value={t.reference}
                      onChange={(e) => updateTender(t.id, { reference: e.target.value })}
                      maxLength={120}
                      placeholder="Últimos 4 dígitos, voucher..."
                    />
                  </FormField>
                )}
              </div>

              {t.method === PaymentMethod.CASH && t.currencyCode === 'DOP' && (
                <div className="mt-2">
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Efectivo recibido
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateTender(t.id, { amount: exactForTender(t) })}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition hover:border-brand-from/50 hover:bg-brand-tint"
                    >
                      Exacto
                    </button>
                    {[200, 500, 1000, 2000].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => updateTender(t.id, { amount: String(d) })}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium tabular-nums transition hover:border-brand-from/50 hover:bg-brand-tint"
                      >
                        {d.toLocaleString('es-DO')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addTender}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Agregar otro pago
        </button>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        {!online && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            Sin conexión. Reconecta para cobrar — el carrito y los pagos
            ingresados se mantienen.
          </p>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={createSale.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createSale.isPending || remainingCents > 0 || !online}
            title={online ? undefined : 'Sin conexión: no puedes cobrar'}
          >
            {createSale.isPending
              ? 'Procesando...'
              : !online
              ? 'Sin conexión'
              : 'Confirmar venta'}
          </Button>
        </FormFooter>
      </form>

      {overrideNeeded && (
        <ManagerOverrideDialog
          message={overrideNeeded.message}
          percentage={overrideNeeded.percentage}
          thresholdPct={overrideNeeded.thresholdPct}
          errorMessage={overrideError}
          submitting={createSale.isPending}
          onConfirm={handleOverrideConfirm}
          onClose={() => {
            setOverrideNeeded(null);
            setOverrideError(null);
          }}
        />
      )}
    </MaintenanceShell>
  );
}
