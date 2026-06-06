import type { FocusEvent } from 'react';

/**
 * Helpers de UX para inputs numéricos. Regla del proyecto: un input numérico no
 * debe MOSTRAR un `0` literal en reposo (obliga a borrarlo antes de escribir →
 * mala experiencia). En su lugar se muestra vacío con `placeholder="0"`, y al
 * enfocar se selecciona todo para que escribir reemplace.
 *
 * El VALOR de negocio no cambia: esto es solo capa de presentación. `''` se
 * interpreta como 0 aguas abajo (los handlers ya usan `Number(...) || 0`).
 */

/**
 * ¿El valor representa cero? `''`/`null`/`undefined` NO cuentan como cero
 * (ya están vacíos; no hay nada que ocultar).
 */
export function isZeroish(value: unknown): boolean {
  if (value === 0) return true;
  if (typeof value === 'string') {
    const t = value.trim();
    return t !== '' && Number.isFinite(Number(t)) && Number(t) === 0;
  }
  return false;
}

/**
 * Valor a mostrar en un input numérico: vacío cuando es cero (deja ver el
 * placeholder). Respeta inputs no controlados (`undefined` → `undefined`).
 */
export function displayNumeric(
  value: string | number | null | undefined,
): string | number | undefined {
  if (value === undefined) return undefined; // no convertir un input no controlado en controlado
  if (value === null) return '';
  return isZeroish(value) ? '' : value;
}

/** Selecciona todo el contenido al enfocar: escribir reemplaza en vez de anteponer. */
export function selectAllOnFocus(e: FocusEvent<HTMLInputElement>): void {
  e.target.select();
}
