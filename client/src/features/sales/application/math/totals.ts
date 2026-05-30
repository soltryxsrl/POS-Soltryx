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
  taxTotal: string;
  total: string;
}

/**
 * Replica el cálculo del backend para preview en vivo.
 * El SERVIDOR siempre recalcula al persistir — esto es solo UX.
 */
export function computeCartTotals(items: CartItem[]): CartTotals {
  let subC = 0;
  let discC = 0;
  let taxC = 0;
  for (const it of items) {
    const grossC = Math.round(toCents(it.unitPrice) * it.quantity);
    const itemDiscC = Math.min(toCents(it.discount), grossC);
    const taxable = grossC - itemDiscC;
    const taxBp = Math.round(Number(it.taxRate) * TAX_FACTOR);
    const taxLineC = Math.round((taxable * taxBp) / (TAX_FACTOR * 100));
    subC += grossC;
    discC += itemDiscC;
    taxC += taxLineC;
  }
  const total = subC - discC + taxC;
  return {
    subtotal: fromCents(subC),
    discountTotal: fromCents(discC),
    taxTotal: fromCents(taxC),
    total: fromCents(total),
  };
}
