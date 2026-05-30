/**
 * Suma decimales-money (numeric(12,2)) preservando precisión.
 */
export function addMoney(a: string, b: string): string {
  const factor = 100;
  const sum = Math.round(parseFloat(a) * factor) + Math.round(parseFloat(b) * factor);
  return formatMoney(sum);
}

export function subMoney(a: string, b: string): string {
  const factor = 100;
  const diff = Math.round(parseFloat(a) * factor) - Math.round(parseFloat(b) * factor);
  return formatMoney(diff);
}

function formatMoney(centavos: number): string {
  const negative = centavos < 0;
  const abs = Math.abs(centavos);
  const whole = Math.trunc(abs / 100);
  const frac = (abs % 100).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}
