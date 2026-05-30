/**
 * Comandos crudos ESC/POS para impresoras térmicas (estándar Epson).
 *
 * NOTA: estos bytes siguen el estándar ESC/POS, pero NO han sido verificados
 * contra una impresora física todavía (el negocio aún no tiene hardware). El
 * camino por defecto del recibo sigue siendo el diálogo de impresión del
 * navegador; esto es la base para impresión cruda + apertura de cajón.
 */

const ESC = 0x1b;
const GS = 0x1d;

/** Inicializa / resetea la impresora (ESC @). */
export const INIT: number[] = [ESC, 0x40];

/** Corte total del papel (GS V 0). */
export const CUT: number[] = [GS, 0x56, 0x00];

/** Alimenta n líneas. */
export function feed(n = 1): number[] {
  return [ESC, 0x64, n & 0xff];
}

/** Alineación: 0=izquierda, 1=centro, 2=derecha (ESC a n). */
export function align(n: 0 | 1 | 2): number[] {
  return [ESC, 0x61, n];
}

/** Negrita on/off (ESC E n). */
export function bold(on: boolean): number[] {
  return [ESC, 0x45, on ? 1 : 0];
}

/** Doble alto/ancho on/off (GS ! n). */
export function doubleSize(on: boolean): number[] {
  return [GS, 0x21, on ? 0x11 : 0x00];
}

/**
 * Pulso de apertura del cajón monedero conectado al puerto RJ11/RJ12 de la
 * impresora. ESC p m t1 t2 — pin 0, on≈25ms (0x19), off≈250ms (0xFA). Es el
 * comando estándar que reconocen la mayoría de las gavetas.
 */
export const KICK_DRAWER: number[] = [ESC, 0x70, 0x00, 0x19, 0xfa];

/** Quita acentos/diacríticos para máxima compatibilidad de codepage. */
export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Codifica texto a bytes ASCII (sin acentos) + salto de línea. */
export function line(text = ''): number[] {
  const ascii = stripDiacritics(text);
  const out: number[] = [];
  for (let i = 0; i < ascii.length; i++) {
    out.push(ascii.charCodeAt(i) & 0x7f);
  }
  out.push(0x0a); // LF
  return out;
}

/** Aplana segmentos de comandos en un solo Uint8Array listo para enviar. */
export function toBytes(...parts: number[][]): Uint8Array {
  return Uint8Array.from(parts.flat());
}
