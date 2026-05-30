/**
 * Devuelve la fecha local en formato `YYYY-MM-DD` (NO usa UTC).
 *
 * Por qué no `toISOString().slice(0, 10)`:
 * - `toISOString()` siempre serializa en UTC. Si el usuario está en RD (UTC-4)
 *   y son las 10pm local, UTC ya es el día siguiente → el filtro de "hoy"
 *   apunta al día equivocado y no encuentra ventas.
 */
export function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Primer día del mes en curso, formato `YYYY-MM-01` (local). */
export function startOfMonthLocalISO(d: Date = new Date()): string {
  return localDateISO(new Date(d.getFullYear(), d.getMonth(), 1));
}
