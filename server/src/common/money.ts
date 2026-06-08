/**
 * Aritmética de dinero en CENTAVOS (enteros) para evitar errores de punto
 * flotante. Versión "lenient" compartida por los módulos fuera de ventas
 * (compras, devoluciones, promociones, cuenta de cliente): acepta `string | number`
 * y no valida formato.
 *
 * El dominio de ventas tiene su propio `sales/domain/services/money.ts` (versión
 * estricta que valida el formato y tiene pruebas); ese NO se toca.
 */
export function toCents(value: string | number): number {
  return Math.round(Number(value) * 100);
}

export function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.trunc(abs / 100)}.${(abs % 100).toString().padStart(2, '0')}`;
}
