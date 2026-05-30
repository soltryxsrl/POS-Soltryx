import type { DenominationCounts } from '../../domain/entities/cash-session.entity';
import { addMoney } from './money';

/**
 * Suma Σ(denom × count) en notación money ("123.45").
 * Las claves son strings que parsean a número (denominación en pesos, p.ej.
 * "2000", "0.25"). Counts deben ser enteros >= 0.
 */
export function sumDenominations(d: DenominationCounts): string {
  let total = '0.00';
  for (const [denomStr, count] of Object.entries(d)) {
    const denom = Number(denomStr);
    if (!Number.isFinite(denom) || denom < 0) continue;
    if (!Number.isFinite(count) || count < 0) continue;
    const contribution = multiplyMoneyByInt(denomToMoney(denom), Math.trunc(count));
    total = addMoney(total, contribution);
  }
  return total;
}

function denomToMoney(d: number): string {
  // d puede tener hasta 2 decimales (p.ej. 0.25). Lo formateamos a money string.
  const cents = Math.round(d * 100);
  const whole = Math.trunc(cents / 100);
  const frac = Math.abs(cents % 100).toString().padStart(2, '0');
  return `${whole}.${frac}`;
}

function multiplyMoneyByInt(m: string, n: number): string {
  const [w, f = '00'] = m.split('.');
  const cents = parseInt(w, 10) * 100 + parseInt(f.padEnd(2, '0').slice(0, 2), 10);
  const totalC = cents * n;
  const sign = totalC < 0 ? '-' : '';
  const abs = Math.abs(totalC);
  return `${sign}${Math.trunc(abs / 100)}.${(abs % 100).toString().padStart(2, '0')}`;
}
