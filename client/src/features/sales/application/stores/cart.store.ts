import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { MoneyDto } from '@/shared/types/enums';

/** Unidad del descuento: monto fijo en RD$ o porcentaje. */
export type DiscountMode = 'AMOUNT' | 'PERCENT';

export interface CartItem {
  /** Clave única de la línea: `productId`, `productId:variantId`, o `open:<rnd>`. */
  lineKey: string;
  /** Null en ítems de "monto libre" (sin producto del catálogo). */
  productId: string | null;
  /** Si la línea es una variante específica. */
  variantId: string | null;
  /** Nombre de la variante, solo para display ("Mediano", "Rojo M"). */
  variantName: string | null;
  productName: string;
  sku: string;
  unitPrice: MoneyDto;
  taxRate: string;
  /** Si el producto se vende por peso (kg). Solo afecta la presentación. */
  soldByWeight: boolean;
  quantity: number;
  /** Descuento EFECTIVO en RD$ (lo que se envía al server y usan los totales). */
  discount: MoneyDto;
  /** Unidad con que el cajero ingresó el descuento de la línea. */
  discountMode: DiscountMode;
  /** Porcentaje tecleado cuando `discountMode==='PERCENT'`. */
  discountPct: string;
  /** Nota libre por línea (modificador, instrucción). Persiste en sale_items. */
  notes: string | null;
}

export interface CartCustomer {
  id: string;
  fullName: string;
  document: string | null;
  /** Tipo de documento: necesario para decidir si el cliente puede usar
   *  comprobantes que exigen RNC (B01/E31/etc.). */
  documentType: 'CEDULA' | 'RNC' | 'PASSPORT' | 'OTHER' | null;
}

export function makeLineKey(productId: string, variantId?: string | null): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

function toCents(s: string | number): number {
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.trunc(abs / 100)}.${(abs % 100).toString().padStart(2, '0')}`;
}

/** RD$ de un % aplicado al subtotal bruto de la línea (clamp a [0, bruto]). */
function lineDiscountFromPct(item: Pick<CartItem, 'unitPrice' | 'quantity'>, pct: string): MoneyDto {
  const grossCents = Math.round(toCents(item.unitPrice) * item.quantity);
  const p = Number(pct);
  if (!Number.isFinite(p) || p <= 0 || grossCents <= 0) return '0.00';
  return fromCents(Math.min(grossCents, Math.round((grossCents * p) / 100)));
}

/** RD$ de un % aplicado a un monto base (clamp a [0, base]). */
export function amountFromPct(baseAmount: MoneyDto, pct: string): MoneyDto {
  const baseCents = toCents(baseAmount);
  const p = Number(pct);
  if (!Number.isFinite(p) || p <= 0 || baseCents <= 0) return '0.00';
  return fromCents(Math.min(baseCents, Math.round((baseCents * p) / 100)));
}

interface CartState {
  items: CartItem[];
  /** Nonce que incrementa en cada addItem — dispara feedback visual en la línea. */
  bump: number;
  /** lineKey del último ítem agregado o incrementado. */
  lastAddedKey: string | null;
  /** Descuento global a la orden (post-impuesto), en RD$. */
  orderDiscount: MoneyDto;
  /** Unidad con que se ingresó el descuento de orden. */
  orderDiscountMode: DiscountMode;
  /** Porcentaje tecleado cuando `orderDiscountMode==='PERCENT'`. */
  orderDiscountPct: string;
  /** Propina añadida al cobrar (no afecta ITBIS). */
  tipTotal: MoneyDto;
  /** Cliente asignado a la venta. Requerido si se usa ACCOUNT (crédito). */
  customer: CartCustomer | null;
  addItem: (
    item: Omit<
      CartItem,
      | 'quantity'
      | 'discount'
      | 'discountMode'
      | 'discountPct'
      | 'lineKey'
      | 'notes'
      | 'productId'
    > & {
      /** Catálogo: siempre un producto real (los ítems abiertos usan addOpenItem). */
      productId: string;
      quantity?: number;
    },
  ) => void;
  /** Agrega una línea de "monto libre" (sin producto del catálogo). */
  addOpenItem: (input: {
    description: string;
    unitPrice: MoneyDto;
    taxRate: string;
    quantity?: number;
  }) => void;
  removeItem: (lineKey: string) => void;
  setQuantity: (lineKey: string, quantity: number) => void;
  /** Fija el descuento de línea como monto en RD$ (modo AMOUNT). */
  setDiscount: (lineKey: string, discount: MoneyDto) => void;
  /** Fija el descuento de línea como porcentaje (modo PERCENT) y deriva el RD$. */
  setDiscountPct: (lineKey: string, pct: string) => void;
  /** Cambia la unidad del descuento de línea (RD$/%), recalculando si aplica. */
  setDiscountMode: (lineKey: string, mode: DiscountMode) => void;
  setNotes: (lineKey: string, notes: string) => void;
  /** Fija el descuento de orden como monto en RD$ (modo AMOUNT). */
  setOrderDiscount: (orderDiscount: MoneyDto) => void;
  /** Fija el descuento de orden como % sobre `baseAmount` (modo PERCENT). */
  setOrderDiscountPct: (pct: string, baseAmount: MoneyDto) => void;
  /** Cambia la unidad del descuento de orden (RD$/%), recalculando si aplica. */
  setOrderDiscountMode: (mode: DiscountMode, baseAmount: MoneyDto) => void;
  setTipTotal: (tipTotal: MoneyDto) => void;
  setCustomer: (customer: CartCustomer | null) => void;
  /**
   * Reemplaza el contenido del carrito (usado al "retomar" un carrito en espera).
   * Acepta items sin `discountMode`/`discountPct` para tolerar carritos guardados
   * antes de que existiera el modo de descuento.
   */
  loadCart: (
    items: Array<
      Omit<CartItem, 'discountMode' | 'discountPct' | 'soldByWeight'> &
        Partial<Pick<CartItem, 'discountMode' | 'discountPct' | 'soldByWeight'>>
    >,
    orderDiscount: MoneyDto,
  ) => void;
  clear: () => void;
}

/**
 * Estado del carrito de la pantalla POS (cliente).
 * Lógica de totales y validaciones de stock viven en use cases puros,
 * no aquí — este store solo guarda estado UI. El descuento se guarda SIEMPRE
 * en RD$ (`discount`/`orderDiscount`); el modo/porcentaje es ayuda de entrada.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
  items: [],
  bump: 0,
  lastAddedKey: null,
  orderDiscount: '0.00',
  orderDiscountMode: 'AMOUNT',
  orderDiscountPct: '0',
  tipTotal: '0.00',
  customer: null,
  addItem: (item) =>
    set((s) => {
      const lineKey = makeLineKey(item.productId, item.variantId);
      const existing = s.items.find((i) => i.lineKey === lineKey);
      if (existing) {
        return {
          bump: s.bump + 1,
          lastAddedKey: lineKey,
          items: s.items.map((i) =>
            i.lineKey === lineKey
              ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
              : i,
          ),
        };
      }
      return {
        bump: s.bump + 1,
        lastAddedKey: lineKey,
        items: [
          ...s.items,
          {
            ...item,
            lineKey,
            quantity: item.quantity ?? 1,
            discount: '0.00',
            discountMode: 'AMOUNT',
            discountPct: '0',
            notes: null,
          },
        ],
      };
    }),
  addOpenItem: (input) =>
    set((s) => {
      const lineKey = `open:${Math.random().toString(36).slice(2)}`;
      return {
        bump: s.bump + 1,
        lastAddedKey: lineKey,
        items: [
          ...s.items,
          {
            lineKey,
            productId: null,
            variantId: null,
            variantName: null,
            productName: input.description,
            sku: 'LIBRE',
            unitPrice: input.unitPrice,
            taxRate: input.taxRate,
            soldByWeight: false,
            quantity: input.quantity ?? 1,
            discount: '0.00',
            discountMode: 'AMOUNT',
            discountPct: '0',
            notes: null,
          },
        ],
      };
    }),
  removeItem: (lineKey) =>
    set((s) => ({ items: s.items.filter((i) => i.lineKey !== lineKey) })),
  setQuantity: (lineKey, quantity) =>
    set((s) => ({
      items: s.items.map((i) => {
        if (i.lineKey !== lineKey) return i;
        const q = Math.max(0, quantity);
        // Si el descuento de la línea es porcentual, recalcula el RD$ con la
        // nueva cantidad para que el % se mantenga.
        const discount =
          i.discountMode === 'PERCENT'
            ? lineDiscountFromPct({ unitPrice: i.unitPrice, quantity: q }, i.discountPct)
            : i.discount;
        return { ...i, quantity: q, discount };
      }),
    })),
  setDiscount: (lineKey, discount) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.lineKey === lineKey ? { ...i, discount, discountMode: 'AMOUNT' } : i,
      ),
    })),
  setDiscountPct: (lineKey, pct) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.lineKey === lineKey
          ? {
              ...i,
              discountMode: 'PERCENT',
              discountPct: pct,
              discount: lineDiscountFromPct(i, pct),
            }
          : i,
      ),
    })),
  setDiscountMode: (lineKey, mode) =>
    set((s) => ({
      items: s.items.map((i) => {
        if (i.lineKey !== lineKey) return i;
        if (mode === 'PERCENT') {
          return { ...i, discountMode: mode, discount: lineDiscountFromPct(i, i.discountPct) };
        }
        return { ...i, discountMode: mode };
      }),
    })),
  setNotes: (lineKey, notes) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.lineKey === lineKey ? { ...i, notes: notes.trim() || null } : i,
      ),
    })),
  setOrderDiscount: (orderDiscount) =>
    set({ orderDiscount, orderDiscountMode: 'AMOUNT' }),
  setOrderDiscountPct: (pct, baseAmount) =>
    set({
      orderDiscountMode: 'PERCENT',
      orderDiscountPct: pct,
      orderDiscount: amountFromPct(baseAmount, pct),
    }),
  setOrderDiscountMode: (mode, baseAmount) =>
    set((s) =>
      mode === 'PERCENT'
        ? {
            orderDiscountMode: mode,
            orderDiscount: amountFromPct(baseAmount, s.orderDiscountPct),
          }
        : { orderDiscountMode: mode },
    ),
  setTipTotal: (tipTotal) => set({ tipTotal }),
  setCustomer: (customer) => set({ customer }),
  loadCart: (items, orderDiscount) =>
    set({
      // Normaliza items que vengan de carritos en espera guardados antes de
      // que existiera el modo de descuento (spread primero, defaults de respaldo).
      items: items.map((i) => ({
        ...i,
        discountMode: i.discountMode ?? ('AMOUNT' as DiscountMode),
        discountPct: i.discountPct ?? '0',
        soldByWeight: i.soldByWeight ?? false,
      })),
      orderDiscount,
      orderDiscountMode: 'AMOUNT',
      orderDiscountPct: '0',
      tipTotal: '0.00',
    }),
  clear: () =>
    set({
      items: [],
      orderDiscount: '0.00',
      orderDiscountMode: 'AMOUNT',
      orderDiscountPct: '0',
      tipTotal: '0.00',
      customer: null,
    }),
    }),
    {
      name: 'pos:cart',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Los efímeros de UI (bump/lastAddedKey) no se persisten.
      partialize: (s) => ({
        items: s.items,
        orderDiscount: s.orderDiscount,
        orderDiscountMode: s.orderDiscountMode,
        orderDiscountPct: s.orderDiscountPct,
        tipTotal: s.tipTotal,
        customer: s.customer,
      }),
    },
  ),
);
