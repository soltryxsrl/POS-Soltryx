import type { DenominationCounts } from '../../domain/types';

/**
 * Denominaciones del peso dominicano (RD$).
 * Orden de mayor a menor para que la UI lo presente naturalmente.
 * 25, 10, 5, 1 son monedas de circulación común; las fracciones (0.25/0.10/0.05/0.01)
 * son extremadamente raras en retail real, pero las mantenemos por completitud.
 */
export const RD_DENOMINATIONS: readonly { value: number; label: string; kind: 'bill' | 'coin' }[] = [
  { value: 2000, label: '2,000', kind: 'bill' },
  { value: 1000, label: '1,000', kind: 'bill' },
  { value: 500, label: '500', kind: 'bill' },
  { value: 200, label: '200', kind: 'bill' },
  { value: 100, label: '100', kind: 'bill' },
  { value: 50, label: '50', kind: 'bill' },
  { value: 25, label: '25', kind: 'coin' },
  { value: 10, label: '10', kind: 'coin' },
  { value: 5, label: '5', kind: 'coin' },
  { value: 1, label: '1', kind: 'coin' },
];

/** Σ(denom × count) como string money "x.yz" */
export function sumDenominations(d: DenominationCounts): string {
  let cents = 0;
  for (const [denomStr, count] of Object.entries(d)) {
    const denom = Number(denomStr);
    if (!Number.isFinite(denom) || denom < 0) continue;
    if (!Number.isFinite(count) || count < 0) continue;
    cents += Math.round(denom * 100) * Math.trunc(count);
  }
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.trunc(abs / 100)}.${(abs % 100).toString().padStart(2, '0')}`;
}

/** Inicializa un mapa con todas las denominaciones en 0. */
export function emptyDenominations(): DenominationCounts {
  const d: DenominationCounts = {};
  for (const { value } of RD_DENOMINATIONS) d[String(value)] = 0;
  return d;
}

/** Filtra denominaciones con count > 0 (para enviar al server más conciso). */
export function pruneDenominations(d: DenominationCounts): DenominationCounts {
  const out: DenominationCounts = {};
  for (const [k, v] of Object.entries(d)) {
    if (v > 0) out[k] = v;
  }
  return out;
}
