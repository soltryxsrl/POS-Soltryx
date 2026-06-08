/**
 * Validadores y formateadores de identificación tributaria de República Dominicana.
 *
 * Soporta:
 *   - **Cédula** de identidad y electoral: 11 dígitos. Formato display: XXX-XXXXXXX-X
 *   - **RNC** (Registro Nacional de Contribuyentes): 9 dígitos. Formato display: X-XX-XXXXX-X
 *   - **Pasaporte**: alfanumérico, longitud variable (no validamos formato, solo no-vacío).
 *
 * Para cédula y RNC se valida el dígito verificador con el algoritmo oficial de
 * Junta Central Electoral / DGII (Luhn modificado con pesos [1,2,1,2,1,2,1,2,1,2]
 * y [7,9,8,6,5,4,3,2,1] respectivamente).
 */

export type RdDocKind = 'CEDULA' | 'RNC' | 'PASSPORT' | 'OTHER';

/** Quita guiones, espacios y cualquier caracter no alfanumérico. */
export function stripFormatting(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '');
}

/**
 * Verifica el dígito verificador de una cédula RD (11 dígitos).
 * Algoritmo JCE: pesos alternados 1,2,1,2,1,2,1,2,1,2 sobre los primeros 10 dígitos.
 * Cada producto >= 10 se reduce sumando sus dígitos. El verificador debe completar
 * un múltiplo de 10.
 */
export function isValidCedula(raw: string): boolean {
  const digits = stripFormatting(raw);
  if (!/^\d{11}$/.test(digits)) return false;
  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let prod = parseInt(digits[i]!, 10) * weights[i]!;
    if (prod >= 10) prod = Math.floor(prod / 10) + (prod % 10);
    sum += prod;
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === parseInt(digits[10]!, 10);
}

/**
 * Verifica el dígito verificador de un RNC (9 dígitos).
 * Algoritmo DGII: pesos 7,9,8,6,5,4,3,2 sobre los primeros 8 dígitos.
 * Según el resto `sum % 11`: 0 → verificador 2, 1 → 1, resto → 11 − resto.
 * (El caso resto 0 → 2 es clave: RNC válidos como 101023122 tienen verificador 2.)
 */
export function isValidRnc(raw: string): boolean {
  const digits = stripFormatting(raw);
  if (!/^\d{9}$/.test(digits)) return false;
  const weights = [7, 9, 8, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(digits[i]!, 10) * weights[i]!;
  }
  const mod = sum % 11;
  const expected = mod === 0 ? 2 : mod === 1 ? 1 : 11 - mod;
  return expected === parseInt(digits[8]!, 10);
}

export type NcfStatus =
  | { state: 'empty' }
  | { state: 'incomplete'; typed: number; total: number; remaining: number }
  | { state: 'invalid'; message: string }
  | { state: 'ok' };

/**
 * Estado del NCF/e-CF MIENTRAS se escribe, para feedback progresivo (no "error
 * de una vez"). Cuenta cuánto falta cuando lo tecleado va bien encaminado, y
 * solo marca error real cuando ya no puede completarse: prefijo equivocado,
 * caracteres que no son dígitos tras el tipo, o demasiado largo.
 *   - NCF físico (tipos B): `B` + 10 dígitos (11 caracteres, ej. B0100000001).
 *   - e-CF electrónico (tipos E): `E` + 12 dígitos (13 caracteres, ej. E310000000001).
 * Si se conoce el código del tipo (B01/E41/…), el NCF debe empezar con él.
 */
export function ncfStatus(docTypeCode: string | undefined, ncf: string): NcfStatus {
  const value = ncf.trim().toUpperCase();
  if (!value) return { state: 'empty' };
  const isE = docTypeCode ? docTypeCode.startsWith('E') : value.startsWith('E');
  const total = isE ? 13 : 11;
  const prefix = docTypeCode || (isE ? 'E' : 'B');

  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!;
    if (i < prefix.length) {
      if (ch !== prefix[i]) {
        return { state: 'invalid', message: `El NCF debe empezar con ${prefix}.` };
      }
    } else if (ch < '0' || ch > '9') {
      return {
        state: 'invalid',
        message: isE
          ? 'Tras el tipo van solo dígitos (e-CF: E + 12 dígitos).'
          : 'Tras el tipo van solo dígitos (NCF: B + 10 dígitos).',
      };
    }
  }
  if (value.length > total) {
    return {
      state: 'invalid',
      message: isE
        ? 'e-CF demasiado largo: E + 12 dígitos (13 caracteres).'
        : 'NCF demasiado largo: B + 10 dígitos (11 caracteres).',
    };
  }
  if (value.length < total) {
    return { state: 'incomplete', typed: value.length, total, remaining: total - value.length };
  }
  return { state: 'ok' };
}

/**
 * Validación "dura" para el ENVÍO (un NCF incompleto cuenta como error). Para el
 * feedback en vivo mientras se teclea, usar `ncfStatus`. Devuelve el mensaje de
 * error, o `null` si es válido (o vacío — lo "requerido" se maneja aparte).
 */
export function ncfErrorFor(docTypeCode: string | undefined, ncf: string): string | null {
  const s = ncfStatus(docTypeCode, ncf);
  if (s.state === 'invalid') return s.message;
  if (s.state === 'incomplete') {
    return `NCF incompleto: faltan ${s.remaining} dígito(s) (${s.typed}/${s.total}).`;
  }
  return null;
}

/** Formato display para cédula: 003-1234567-8 */
export function formatCedula(raw: string): string {
  const d = stripFormatting(raw);
  if (d.length !== 11) return raw;
  return `${d.slice(0, 3)}-${d.slice(3, 10)}-${d.slice(10)}`;
}

/** Formato display para RNC: 1-31-12345-6 */
export function formatRnc(raw: string): string {
  const d = stripFormatting(raw);
  if (d.length !== 9) return raw;
  return `${d.slice(0, 1)}-${d.slice(1, 3)}-${d.slice(3, 8)}-${d.slice(8)}`;
}

/**
 * Valida según el tipo. Devuelve null si está bien, o un mensaje de error.
 * Para tipos sin tipo seleccionado o PASSPORT/OTHER, solo valida que no esté vacío.
 */
export function validateRdIdentifier(
  kind: RdDocKind | null | undefined,
  raw: string,
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null; // documento opcional — vacío es OK
  if (kind === 'CEDULA') {
    if (!isValidCedula(trimmed)) {
      return 'Cédula inválida (deben ser 11 dígitos con verificador correcto)';
    }
  }
  if (kind === 'RNC') {
    if (!isValidRnc(trimmed)) {
      return 'RNC inválido (deben ser 9 dígitos con verificador correcto)';
    }
  }
  // PASSPORT / OTHER: no validamos formato
  return null;
}

/** Auto-formatea según el tipo cuando el largo coincide. Sino devuelve raw. */
export function autoFormatRdIdentifier(
  kind: RdDocKind | null | undefined,
  raw: string,
): string {
  if (kind === 'CEDULA') return formatCedula(raw);
  if (kind === 'RNC') return formatRnc(raw);
  return raw;
}
