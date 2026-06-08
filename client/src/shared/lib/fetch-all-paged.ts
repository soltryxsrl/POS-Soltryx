/**
 * Trae TODAS las filas de un endpoint paginado, hasta `cap`, paginando del lado
 * del cliente. Se usa al AGRUPAR una tabla: los grupos y subtotales necesitan el
 * dataset completo, pero el backend topa cada request (`@Max(200)` en `limit`),
 * así que iteramos páginas de `pageSize` y las concatenamos.
 *
 * La primera página da el `total`; las restantes se piden en paralelo. El
 * resultado se recorta a `cap` por si el total lo supera (la UI avisa que la
 * agrupación quedó parcial cuando `items.length < total`).
 *
 * `listFn` recibe `{ ...baseParams, limit, offset }` y debe devolver
 * `{ items, total }` (forma estándar de los list endpoints del proyecto).
 */
export async function fetchAllPaged<T, P extends object>(
  listFn: (params: P & { limit: number; offset: number }) => Promise<{ items: T[]; total: number }>,
  baseParams: P,
  opts: { pageSize?: number; cap?: number } = {},
): Promise<{ items: T[]; total: number }> {
  const pageSize = opts.pageSize ?? 200;
  const cap = opts.cap ?? 2000;

  const first = await listFn({ ...baseParams, limit: pageSize, offset: 0 });
  const total = first.total;
  const target = Math.min(total, cap);
  const items = first.items.slice();

  const offsets: number[] = [];
  for (let o = pageSize; o < target; o += pageSize) offsets.push(o);
  if (offsets.length > 0) {
    const pages = await Promise.all(
      offsets.map((offset) => listFn({ ...baseParams, limit: pageSize, offset })),
    );
    for (const p of pages) items.push(...p.items);
  }

  return { items: items.slice(0, cap), total };
}
