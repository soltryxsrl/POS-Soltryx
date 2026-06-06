'use client';

import { useEffect, useState } from 'react';
import { Clock, HandCoins, MessageSquare, Minus, Percent, Plus, ShieldAlert, ShoppingBag, Sparkles, Tag, Trash2, UserCircle2, X } from 'lucide-react';
import { formatMoney } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { displayNumeric, selectAllOnFocus } from '@/shared/lib/numeric-field';
import { useOnlineStatus } from '@/shared/lib/use-online-status';
import { Button } from '@/shared/ui/controls/Button';
import { useBusinessInfo } from '@/features/config/application/hooks/use-business-info';
import { usePromotions } from '@/features/promotions/application/hooks/use-promotions';
import { usePreviewTotals } from '../../application/hooks/use-preview-totals';
import { computeCartTotals } from '../../application/math/totals';
import { useCartStore, type CartItem } from '../../application/stores/cart.store';

interface Props {
  onCheckout: () => void;
  /** Si se provee, muestra el botón "Guardar para después". */
  onPark?: () => void;
  /** Si se provee, muestra el selector de cliente arriba del cart. */
  onPickCustomer?: () => void;
}

export function Cart({ onCheckout, onPark, onPickCustomer }: Props) {
  const items = useCartStore((s) => s.items);
  const orderDiscount = useCartStore((s) => s.orderDiscount);
  const tipTotal = useCartStore((s) => s.tipTotal);
  const setTipTotal = useCartStore((s) => s.setTipTotal);
  const customer = useCartStore((s) => s.customer);
  const setCustomer = useCartStore((s) => s.setCustomer);
  const setOrderDiscount = useCartStore((s) => s.setOrderDiscount);
  const orderDiscountMode = useCartStore((s) => s.orderDiscountMode);
  const orderDiscountPct = useCartStore((s) => s.orderDiscountPct);
  const setOrderDiscountPct = useCartStore((s) => s.setOrderDiscountPct);
  const setOrderDiscountMode = useCartStore((s) => s.setOrderDiscountMode);
  const clear = useCartStore((s) => s.clear);
  const bump = useCartStore((s) => s.bump);
  const lastAddedKey = useCartStore((s) => s.lastAddedKey);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const business = useBusinessInfo();
  const online = useOnlineStatus();
  const tipEnabled = business.data?.tipEnabled ?? false;
  const priceIncludesTax = business.data?.priceIncludesTax ?? false;
  const overrideThresholdPct = (() => {
    const raw = business.data?.discountOverrideThresholdPct;
    const parsed = raw ? parseFloat(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 15;
  })();

  const localTotals = computeCartTotals(
    items,
    orderDiscount,
    tipTotal,
    priceIncludesTax,
  );
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
  const canCheckout = items.length > 0 && Number(totals.total) > 0;
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const activePromos = usePromotions({ status: 'active', limit: 1 });
  const hasActivePromos = (activePromos.data?.total ?? 0) > 0;
  const promoApplied = preview?.appliedPromotions ?? [];

  // % de descuento manual (líneas + orden) sobre el subtotal — para warning
  // preventivo de override antes de que el cajero le dé a Cobrar.
  const manualDiscountPct = (() => {
    const subC = Math.round(Number(totals.subtotal) * 100);
    if (subC <= 0) return 0;
    const manualLineC = items.reduce(
      (acc, it) => acc + Math.round((Number(it.discount) || 0) * 100),
      0,
    );
    const manualOrderC = Math.round((Number(orderDiscount) || 0) * 100);
    return ((manualLineC + manualOrderC) * 100) / subC;
  })();
  const needsOverride = manualDiscountPct > overrideThresholdPct;

  // Base sobre la que se calcula el descuento de orden en %: total de mercancía
  // antes del descuento de orden (en inclusive el ITBIS ya va dentro).
  const orderDiscountBase = (() => {
    const c =
      Math.round(Number(totals.subtotal) * 100) -
      Math.round(Number(totals.discountTotal) * 100) +
      (priceIncludesTax ? 0 : Math.round(Number(totals.taxTotal) * 100));
    return (Math.max(0, c) / 100).toFixed(2);
  })();

  // Si el descuento de orden es %, manténlo aplicado al cambiar los ítems.
  // `orderDiscountBase` no depende del propio descuento de orden → sin bucle.
  useEffect(() => {
    if (orderDiscountMode === 'PERCENT' && items.length > 0) {
      setOrderDiscountPct(orderDiscountPct, orderDiscountBase);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderDiscountBase, orderDiscountMode]);

  // Destella la línea recién agregada/incrementada (confirma el escaneo).
  useEffect(() => {
    if (!lastAddedKey) return;
    setFlashKey(lastAddedKey);
    const id = window.setTimeout(() => setFlashKey(null), 600);
    return () => window.clearTimeout(id);
  }, [bump, lastAddedKey]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-brand-soft/40">
      {/* Encabezado del carrito */}
      <div className="relative flex items-center gap-2 border-b border-border bg-gradient-to-br from-brand-tint via-card to-card px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-from to-brand-to text-white shadow-sm shadow-brand-from/30">
          <ShoppingBag className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">Carrito</h2>
          <p className="text-[11px] text-muted-foreground">
            {items.length} línea{items.length === 1 ? '' : 's'} · {itemCount} unidad
            {itemCount === 1 ? '' : 'es'}
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            title="Vaciar carrito"
          >
            <Trash2 className="h-3 w-3" />
            Vaciar
          </button>
        )}
      </div>

      {/* Cliente */}
      {onPickCustomer && (
        <div className="border-b border-border px-3 py-2">
          {customer ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPickCustomer}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/60 bg-background px-2 py-1.5 text-left transition hover:border-brand-from/40 hover:bg-brand-tint/50"
              >
                <UserCircle2 className="h-4 w-4 flex-shrink-0 text-brand-from" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    {customer.fullName}
                  </span>
                  {customer.document && (
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {customer.document}
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCustomer(null)}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-destructive"
                aria-label="Quitar cliente"
                title="Quitar cliente"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onPickCustomer}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border/70 px-2 py-1.5 text-xs text-muted-foreground transition hover:border-brand-from/40 hover:bg-brand-tint/40 hover:text-brand-from"
            >
              <UserCircle2 className="h-4 w-4" />
              Asignar cliente (opcional)
            </button>
          )}
        </div>
      )}

      {/* Líneas */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {items.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-tint text-brand-from">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-foreground">Carrito vacío</p>
            <p className="text-xs text-muted-foreground">
              Agrega productos desde la izquierda o escanea un código.
            </p>
          </div>
        )}
        {items.map((it) => (
          <CartLine key={it.lineKey} item={it} isFlashing={flashKey === it.lineKey} />
        ))}
      </div>

      {/* Totales — compacto: desglose en una línea para no comerse la lista */}
      <div className="border-t border-border bg-gradient-to-b from-card to-brand-tint/30 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Subtotal{' '}
            <span className="font-semibold tabular-nums text-foreground">
              {formatMoney(totals.subtotal)}
            </span>
          </span>
          {Number(totals.discountTotal) > 0 && (
            <span>
              Desc.{' '}
              <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                −{formatMoney(totals.discountTotal)}
              </span>
            </span>
          )}
          <span>
            {priceIncludesTax ? 'ITBIS incl.' : 'ITBIS'}{' '}
            <span className="font-semibold tabular-nums text-foreground">
              {formatMoney(totals.taxTotal)}
            </span>
          </span>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-3 rounded-lg border border-dashed border-border/70 bg-muted/30 px-2 py-1">
          <label
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"
            htmlFor="order-discount-input"
          >
            <Tag className="h-3 w-3" />
            Descuento a toda la orden
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setOrderDiscountMode(
                  orderDiscountMode === 'PERCENT' ? 'AMOUNT' : 'PERCENT',
                  orderDiscountBase,
                )
              }
              disabled={items.length === 0}
              className="rounded-md border border-border bg-muted/60 px-1.5 py-1 text-[11px] font-bold text-foreground transition hover:border-brand-from/50 hover:bg-brand-tint hover:text-brand-from disabled:opacity-50"
              title="Cambiar entre RD$ y % (toca para alternar)"
              aria-label="Cambiar unidad del descuento de orden"
            >
              {orderDiscountMode === 'PERCENT' ? '%' : 'RD$'}
            </button>
            {orderDiscountMode === 'PERCENT' ? (
              <input
                id="order-discount-input"
                value={displayNumeric(orderDiscountPct)}
                onChange={(e) => setOrderDiscountPct(e.target.value, orderDiscountBase)}
                onFocus={selectAllOnFocus}
                pattern="^\d+(\.\d{1,2})?$"
                inputMode="decimal"
                disabled={items.length === 0}
                className="w-20 rounded-md border border-border/60 bg-background px-1.5 py-0.5 text-right text-xs tabular-nums outline-none focus:border-brand-from/60 focus:ring-2 focus:ring-brand-from/20 disabled:opacity-50"
                placeholder="0"
              />
            ) : (
              <input
                id="order-discount-input"
                value={displayNumeric(orderDiscount)}
                onChange={(e) => setOrderDiscount(e.target.value)}
                onFocus={selectAllOnFocus}
                pattern="^\d+(\.\d{1,2})?$"
                inputMode="decimal"
                disabled={items.length === 0}
                className="w-20 rounded-md border border-border/60 bg-background px-1.5 py-0.5 text-right text-xs tabular-nums outline-none focus:border-brand-from/60 focus:ring-2 focus:ring-brand-from/20 disabled:opacity-50"
                placeholder="0.00"
              />
            )}
          </div>
        </div>
        {Number(totals.orderDiscount) > 0 && (
          <div className="mt-1.5 text-sm">
            <Row
              label="Descuento de orden aplicado"
              value={`−${formatMoney(totals.orderDiscount)}`}
              negative
            />
          </div>
        )}

        {needsOverride && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <span>
              Descuento {manualDiscountPct.toFixed(1)}% supera el umbral{' '}
              {overrideThresholdPct}%. Al cobrar pediremos autorización de un manager.
            </span>
          </div>
        )}

        {tipEnabled && (
          <TipSection
            tipTotal={tipTotal}
            totalBeforeTip={(() => {
              const beforeC =
                Math.round(Number(totals.total) * 100) -
                Math.round(Number(totals.tipTotal) * 100);
              return (Math.max(0, beforeC) / 100).toFixed(2);
            })()}
            onChange={setTipTotal}
            disabled={items.length === 0}
          />
        )}

        {promoApplied.length > 0 && (
          <div className="mt-2 space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            <div className="flex items-center gap-1.5 font-semibold">
              <Sparkles className="h-3 w-3" />
              Promociones (automáticas)
            </div>
            <ul className="space-y-0.5 pl-4">
              {promoApplied.map((p) => (
                <li key={p.promotionId} className="flex justify-between gap-2">
                  <span className="truncate">{p.promotionName}</span>
                  <span className="font-semibold tabular-nums">
                    −{formatMoney(p.discountAmount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {hasActivePromos && items.length > 0 && promoApplied.length === 0 && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <span>Hay promociones activas. Aplicarán al cobrar si califica.</span>
          </div>
        )}

        {!online && (
          <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            Sin conexión: el carrito queda guardado, pero el cobro se habilita al
            reconectar.
          </p>
        )}

        {/* Total + Cobrar en la misma fila para ahorrar alto vertical */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="flex flex-col justify-center rounded-xl bg-gradient-to-br from-brand-from to-brand-to px-3 py-2 text-white shadow-sm shadow-brand-from/30">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/80">
              Total a cobrar
            </span>
            <span className="text-xl font-bold leading-tight tabular-nums">
              {formatMoney(totals.total)}
            </span>
          </div>
          <Button
            type="button"
            size="lg"
            onClick={onCheckout}
            disabled={!canCheckout}
            className="h-full w-full text-base"
            title={
              online
                ? 'Cobrar (F2)'
                : 'Sin conexión: la venta no fiscal se guardará offline'
            }
          >
            Cobrar
            <span className="ml-1 hidden rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider sm:inline">
              F2
            </span>
          </Button>
        </div>

        {onPark && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPark}
            disabled={items.length === 0}
            className="mt-1.5 w-full"
            title="Guardar para después (F4)"
          >
            <Clock className="h-4 w-4" />
            Guardar para después
            <span className="ml-auto hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground sm:inline">
              F4
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Una línea del carrito. Fila limpia por defecto (nombre + cantidad + total);
 * el descuento de la línea vive detrás del botón "Desc." y se muestra como chip
 * (−RD$X / −Y%) cuando está activo, para que nunca se confunda con el precio.
 */
function CartLine({ item: it, isFlashing }: { item: CartItem; isFlashing: boolean }) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const setDiscountPct = useCartStore((s) => s.setDiscountPct);
  const setDiscountMode = useCartStore((s) => s.setDiscountMode);
  const setNotes = useCartStore((s) => s.setNotes);
  const removeItem = useCartStore((s) => s.removeItem);
  const [discOpen, setDiscOpen] = useState(false);

  const lineSubtotal = Number(it.unitPrice) * it.quantity;
  const lineDiscount = Number(it.discount) || 0;
  const lineNet = lineSubtotal - lineDiscount;
  const hasDiscount = lineDiscount > 0;
  const displayName = it.variantName
    ? `${it.productName} · ${it.variantName}`
    : it.productName;
  const isPercent = it.discountMode === 'PERCENT';
  const chipLabel =
    isPercent && Number(it.discountPct) > 0
      ? `−${it.discountPct}%`
      : `−${formatMoney(it.discount)}`;

  return (
    <div
      className={cn(
        'group mb-1.5 rounded-xl border bg-background px-2.5 py-2 transition hover:border-brand-from/30 hover:shadow-sm',
        isFlashing
          ? 'border-brand-from bg-brand-tint/40 ring-2 ring-brand-from/50'
          : 'border-border/60',
      )}
    >
      {/* Fila A: nombre · total de la línea · quitar */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="line-clamp-1 text-sm font-medium text-foreground">
            {displayName}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {it.sku} · {formatMoney(it.unitPrice)} {it.soldByWeight ? '/kg' : 'c/u'}
          </div>
        </div>
        <div className="text-right">
          {hasDiscount && (
            <div className="text-[10px] tabular-nums text-muted-foreground line-through">
              {formatMoney(lineSubtotal)}
            </div>
          )}
          <div className="text-sm font-bold tabular-nums text-foreground">
            {formatMoney(lineNet)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => removeItem(it.lineKey)}
          className="-mr-1 -mt-1 rounded-md p-1.5 text-muted-foreground opacity-60 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          title="Quitar línea"
          aria-label="Quitar línea"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Fila C: cantidad + botón de descuento (oculto por defecto) */}
      <div className="mt-2 flex items-center gap-2">
        <div className="inline-flex items-center rounded-lg border border-border/60 bg-card">
          <button
            type="button"
            onClick={() => setQuantity(it.lineKey, it.quantity - 1)}
            className="flex h-10 w-10 items-center justify-center text-muted-foreground transition hover:text-brand-from"
            aria-label="Disminuir cantidad"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="number"
            min={0}
            step="0.001"
            value={displayNumeric(it.quantity)}
            onChange={(e) => setQuantity(it.lineKey, Number(e.target.value) || 0)}
            onFocus={selectAllOnFocus}
            aria-label="Cantidad (admite decimales para venta por peso)"
            title="Admite decimales (venta por peso: 0.750, 1.5, etc.)"
            className="h-10 w-14 border-x border-border/60 bg-transparent text-center text-sm font-semibold tabular-nums outline-none focus:bg-brand-tint/40"
            placeholder="0"
          />
          <button
            type="button"
            onClick={() => setQuantity(it.lineKey, it.quantity + 1)}
            className="flex h-10 w-10 items-center justify-center text-muted-foreground transition hover:text-brand-from"
            aria-label="Aumentar cantidad"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {it.soldByWeight && (
          <span
            className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            title="Producto por peso — cantidad en kilogramos"
          >
            kg
          </span>
        )}

        <button
          type="button"
          onClick={() => setDiscOpen((o) => !o)}
          aria-expanded={discOpen}
          className={cn(
            'ml-auto inline-flex h-10 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition',
            hasDiscount
              ? 'border-brand-from/40 bg-brand-tint text-brand-from'
              : 'border-border/60 bg-card text-muted-foreground hover:border-brand-from/40 hover:text-brand-from',
          )}
          title="Descuento de esta línea"
        >
          <Percent className="h-3.5 w-3.5" />
          {hasDiscount ? chipLabel : 'Desc.'}
        </button>
      </div>

      {/* Editor de descuento de la línea (colapsado) */}
      {discOpen && (
        <div className="mt-2 rounded-lg border border-border/60 bg-card px-2.5 py-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              Descuento de esta línea
            </span>
            {hasDiscount && (
              <span className="text-[11px] font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                −{formatMoney(it.discount)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex flex-shrink-0 overflow-hidden rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setDiscountMode(it.lineKey, 'AMOUNT')}
                className={cn(
                  'px-2.5 py-2 text-xs font-bold transition',
                  !isPercent
                    ? 'bg-brand-from text-white'
                    : 'bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                RD$
              </button>
              <button
                type="button"
                onClick={() => setDiscountMode(it.lineKey, 'PERCENT')}
                className={cn(
                  'px-2.5 py-2 text-xs font-bold transition',
                  isPercent
                    ? 'bg-brand-from text-white'
                    : 'bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                %
              </button>
            </div>
            {isPercent ? (
              <input
                value={displayNumeric(it.discountPct)}
                onChange={(e) => setDiscountPct(it.lineKey, e.target.value)}
                onFocus={selectAllOnFocus}
                pattern="^\d+(\.\d{1,2})?$"
                inputMode="decimal"
                autoFocus
                aria-label="Descuento de la línea en porcentaje"
                className="h-10 flex-1 rounded-lg border border-border/60 bg-background px-2.5 text-right text-sm tabular-nums outline-none focus:border-brand-from/60 focus:ring-2 focus:ring-brand-from/20"
                placeholder="0"
              />
            ) : (
              <input
                value={displayNumeric(it.discount)}
                onChange={(e) => setDiscount(it.lineKey, e.target.value)}
                onFocus={selectAllOnFocus}
                pattern="^\d+(\.\d{1,2})?$"
                inputMode="decimal"
                autoFocus
                aria-label="Descuento de la línea en pesos dominicanos"
                className="h-10 flex-1 rounded-lg border border-border/60 bg-background px-2.5 text-right text-sm tabular-nums outline-none focus:border-brand-from/60 focus:ring-2 focus:ring-brand-from/20"
                placeholder="0.00"
              />
            )}
          </div>
        </div>
      )}

      <NoteRow lineKey={it.lineKey} value={it.notes} onChange={(v) => setNotes(it.lineKey, v)} />
    </div>
  );
}

function NoteRow({
  lineKey,
  value,
  onChange,
}: {
  lineKey: string;
  value: string | null;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(!!value);
  if (!open && !value) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground transition hover:text-brand-from"
      >
        <MessageSquare className="h-3 w-3" />
        Agregar nota
      </button>
    );
  }
  return (
    <div className="mt-1.5 flex items-start gap-1.5">
      <MessageSquare className="mt-1 h-3 w-3 flex-shrink-0 text-muted-foreground" />
      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (!value) setOpen(false);
        }}
        maxLength={200}
        placeholder="Nota: sin sal, para llevar..."
        aria-label={`Nota para la línea ${lineKey}`}
        className="flex-1 rounded-md border border-border/40 bg-card px-1.5 py-0.5 text-[11px] outline-none placeholder:text-muted-foreground/60 focus:border-brand-from/60 focus:ring-1 focus:ring-brand-from/20"
      />
    </div>
  );
}

function TipSection({
  tipTotal,
  totalBeforeTip,
  onChange,
  disabled,
}: {
  tipTotal: string;
  totalBeforeTip: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const applyPct = (pct: number) => {
    const baseC = Math.round(Number(totalBeforeTip) * 100);
    const tipC = Math.round((baseC * pct) / 100);
    onChange((tipC / 100).toFixed(2));
  };
  const activePct = (() => {
    const tC = Math.round(Number(tipTotal) * 100);
    if (tC <= 0) return 0;
    const baseC = Math.round(Number(totalBeforeTip) * 100);
    if (baseC <= 0) return null;
    const pct = Math.round((tC * 100) / baseC);
    return [10, 15, 20].includes(pct) ? pct : null;
  })();

  return (
    <div className="mt-2 space-y-1.5 rounded-lg border border-border/60 bg-card px-2 py-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <HandCoins className="h-3 w-3" />
          Propina (10% Ley 16-92)
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {formatMoney(tipTotal)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {[10, 15, 20].map((pct) => (
          <button
            key={pct}
            type="button"
            onClick={() => applyPct(pct)}
            disabled={disabled}
            className={cn(
              'rounded-md border px-2 py-0.5 text-[11px] font-semibold transition disabled:opacity-50',
              activePct === pct
                ? 'border-brand-from/60 bg-brand-tint text-brand-from'
                : 'border-border bg-background hover:border-brand-from/40 hover:text-brand-from',
            )}
          >
            {pct}%
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange('0.00')}
          disabled={disabled}
          className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground transition hover:border-foreground/30 disabled:opacity-50"
        >
          Sin propina
        </button>
        <input
          value={displayNumeric(tipTotal)}
          onChange={(e) => onChange(e.target.value)}
          onFocus={selectAllOnFocus}
          pattern="^\d+(\.\d{1,2})?$"
          inputMode="decimal"
          disabled={disabled}
          aria-label="Propina en pesos dominicanos"
          title="Monto manual de propina (RD$)"
          className="ml-auto w-20 rounded-md border border-border/60 bg-background px-1.5 py-0.5 text-right text-[11px] tabular-nums outline-none focus:border-brand-from/60 focus:ring-2 focus:ring-brand-from/20 disabled:opacity-50"
          placeholder="0.00"
        />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  negative,
  muted,
}: {
  label: string;
  value: string;
  negative?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={
        muted
          ? 'flex justify-between text-xs text-muted-foreground'
          : 'flex justify-between text-sm'
      }
    >
      <span>{label}</span>
      <span
        className={
          negative
            ? 'font-medium tabular-nums text-rose-600 dark:text-rose-400'
            : 'tabular-nums'
        }
      >
        {value}
      </span>
    </div>
  );
}
