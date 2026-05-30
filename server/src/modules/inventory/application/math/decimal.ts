/**
 * Suma decimales como strings preservando precisión.
 * Resultado redondeado a `scale` decimales con truncación matemática estándar.
 *
 * Solo para uso interno del dominio de inventario (suma + escala fija).
 * Si necesitamos precisión arbitraria/operaciones más complejas, considerar `decimal.js`.
 */
export function addDecimal(a: string, b: string, scale: number): string {
  const factor = 10 ** scale;
  const ai = Math.round(parseFloat(a) * factor);
  const bi = Math.round(parseFloat(b) * factor);
  const sum = ai + bi;
  const whole = Math.trunc(sum / factor);
  const frac = Math.abs(sum % factor)
    .toString()
    .padStart(scale, '0');
  const sign = sum < 0 && whole === 0 ? '-' : '';
  return `${sign}${whole}.${frac}`;
}
