import type { CartItem } from '../stores/cart.store';

const MONEY_FACTOR = 100;
const TAX_FACTOR = 100;

function toCents(s: string | number): number {
  return Math.round(Number(s) * MONEY_FACTOR);
}
function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / MONEY_FACTOR);
  const frac = (abs % MONEY_FACTOR).toString().padStart(2, '0');
  return `${sign}${whole}.${frac}`;
}

export interface CartTotals {
  subtotal: string;
  discountTotal: string;
  /** Descuento global aplicado (post-impuesto), clamp'd a [0, gross]. */
  orderDiscount: string;
  taxTotal: string;
  /** Propina (no afecta ITBIS), opcional. */
  tipTotal: string;
  total: string;
}

/**
 * Replica el cálculo del backend para preview en vivo.
 * El SERVIDOR siempre recalcula al persistir — esto es solo UX.
 *
 * orderDiscount es POST-impuesto: se resta del total después del ITBIS.
 * tipTotal se SUMA después (no afecta ITBIS).
 *   total = subtotal − discountTotal + taxTotal − orderDiscount + tipTotal
 *
 * Si `priceIncludesTax` es true, los unitPrice YA incluyen ITBIS (norma RD): el
 * impuesto se back-calcula desde el bruto y NO se suma al total.
 */
export function computeCartTotals(
  items: CartItem[],
  orderDiscount: string = '0.00',
  tipTotal: string = '0.00',
  priceIncludesTax: boolean = false,
): CartTotals {
  let subC = 0;
  let discC = 0;
  let taxC = 0;
  for (const it of items) {
    const grossC = Math.round(toCents(it.unitPrice) * it.quantity);
    const itemDiscC = Math.min(toCents(it.discount), grossC);
    const afterDiscC = grossC - itemDiscC;
    const taxBp = Math.round(Number(it.taxRate) * TAX_FACTOR);
    const taxLineC = priceIncludesTax
      ? afterDiscC - Math.round((afterDiscC * 10000) / (10000 + taxBp))
      : Math.round((afterDiscC * taxBp) / (TAX_FACTOR * 100));
    subC += grossC;
    discC += itemDiscC;
    taxC += taxLineC;
  }
  const grossTotal = priceIncludesTax ? subC - discC : subC - discC + taxC;
  const requestedOrderDiscC = Math.max(0, toCents(orderDiscount));
  const orderDiscC = Math.min(requestedOrderDiscC, Math.max(0, grossTotal));
  const tipC = Math.max(0, toCents(tipTotal));
  const total = grossTotal - orderDiscC + tipC;
  return {
    subtotal: fromCents(subC),
    discountTotal: fromCents(discC),
    orderDiscount: fromCents(orderDiscC),
    taxTotal: fromCents(taxC),
    tipTotal: fromCents(tipC),
    total: fromCents(total),
  };
}
