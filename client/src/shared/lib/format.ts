/**
 * Formatea un decimal (string o number) como moneda DOP por defecto.
 */
export function formatMoney(value: string | number, currency: string = 'DOP'): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Formatea una cantidad (decimal con hasta 3 decimales) sin moneda. */
export function formatQuantity(value: string | number, maxDecimals = 3): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat('es-DO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(n);
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });
}
