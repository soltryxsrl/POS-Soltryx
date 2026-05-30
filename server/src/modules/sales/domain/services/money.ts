/**
 * Aritmética de dinero con enteros (centavos) para evitar imprecisión float.
 * - Money: 2 decimales — internamente en cents.
 * - Quantity: hasta 3 decimales — internamente en milli-units.
 * - Tax rate: porcentaje con hasta 2 decimales — internamente en basis points / 100
 *   (i.e. multiplicamos por 100 para tener 2 decimales).
 */

const MONEY_FACTOR = 100; // 2 decimals
const QTY_FACTOR = 1000; // 3 decimals
const TAX_FACTOR = 100; // 2 decimals

export function toCents(money: string): number {
  if (!/^-?\d+(\.\d+)?$/.test(money)) throw new Error(`Invalid money: ${money}`);
  return Math.round(parseFloat(money) * MONEY_FACTOR);
}

export function fromCents(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / MONEY_FACTOR);
  const frac = (abs % MONEY_FACTOR).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

export function toQty(qty: string): number {
  if (!/^-?\d+(\.\d+)?$/.test(qty)) throw new Error(`Invalid qty: ${qty}`);
  return Math.round(parseFloat(qty) * QTY_FACTOR);
}

export function fromQty(milliUnits: number): string {
  const negative = milliUnits < 0;
  const abs = Math.abs(milliUnits);
  const whole = Math.trunc(abs / QTY_FACTOR);
  const frac = (abs % QTY_FACTOR).toString().padStart(3, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

export function toTaxBp(rate: string): number {
  if (!/^-?\d+(\.\d+)?$/.test(rate)) throw new Error(`Invalid tax rate: ${rate}`);
  return Math.round(parseFloat(rate) * TAX_FACTOR);
}

export function addMoney(a: string, b: string): string {
  return fromCents(toCents(a) + toCents(b));
}

export function subMoney(a: string, b: string): string {
  return fromCents(toCents(a) - toCents(b));
}

/**
 * Devuelve unitPrice (cents) * quantity (milli-units) → cents.
 * Redondea al centavo más cercano (half-away-from-zero) — práctica estándar.
 */
export function multiplyMoneyByQty(unitPriceCents: number, qtyMilli: number): number {
  const product = unitPriceCents * qtyMilli; // cents * milli = cents*1000
  // dividir por 1000 con redondeo bancario sería ideal; medio-arriba es suficiente para MVP
  return Math.round(product / QTY_FACTOR);
}

/**
 * Aplica una tasa (basis points × 100) sobre un monto (cents).
 * Ej: rate=1800 (18.00%) sobre 10000 cents → 1800 cents.
 */
export function applyTaxRate(baseCents: number, taxBp: number): number {
  return Math.round((baseCents * taxBp) / (TAX_FACTOR * 100));
}

export function isNegativeOrZero(money: string): boolean {
  return toCents(money) <= 0;
}

export function compareMoney(a: string, b: string): -1 | 0 | 1 {
  const ac = toCents(a);
  const bc = toCents(b);
  return ac < bc ? -1 : ac > bc ? 1 : 0;
}
