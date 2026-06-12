'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AlertCircle, Barcode, ImageOff, Package, Search, ZapOff } from 'lucide-react';
import { formatMoney, formatQuantity } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { useProducts } from '@/features/products/application/hooks/use-products';
import type { Product } from '@/features/products/domain/types';

interface Props {
  onPick: (product: Product) => void;
  categoryId: string | null;
  /** Ref opcional para que el padre pueda enfocar el input (atajo "/"). */
  inputRef?: React.RefObject<HTMLInputElement>;
}

/**
 * Heurística simple para detectar input de lector de barras:
 * un scanner suele inyectar caracteres en lotes muy rápidos (<25ms entre teclas).
 */
const SCAN_THRESHOLD_MS = 25;

export function ProductSearch({ onPick, categoryId, inputRef }: Props) {
  const [q, setQ] = useState('');
  // El query usa la versión debounceada (~250ms): el tecleo humano no dispara
  // una request por tecla. Enter hace "flush" inmediato (ver onKeyDown).
  const [debouncedQ, setDebouncedQ] = useState('');
  const [scanFlash, setScanFlash] = useState(false);
  /** Texto buscado con Enter cuyo resultado no encontró producto. */
  const [notFound, setNotFound] = useState<string | null>(null);
  /**
   * Enter con el query aún en vuelo: guardamos el texto y auto-agregamos el
   * primer resultado cuando el fetch resuelva. Un scanner teclea el código
   * completo + Enter en <200ms — sin esto, el Enter caía en una lista stale
   * (o vacía) y el escaneo fallaba al primer intento.
   */
  const [pendingPickQ, setPendingPickQ] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const products = useProducts(
    {
      q: debouncedQ || undefined,
      categoryId: categoryId ?? undefined,
      isActive: true,
      limit: 18,
    },
    { keepPrevious: true },
  );

  const items = products.data?.items ?? [];

  // Tracking de timestamp de la última tecla — si las teclas vienen muy seguidas
  // asumimos lectura por scanner y auto-agregamos al detectar Enter.
  const lastKeyTsRef = useRef<number>(0);
  const fastStreakRef = useRef<number>(0);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const now = performance.now();
    const dt = now - lastKeyTsRef.current;
    if (dt < SCAN_THRESHOLD_MS) {
      fastStreakRef.current += 1;
    } else {
      fastStreakRef.current = 0;
    }
    lastKeyTsRef.current = now;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (!q.trim()) return;
      setNotFound(null);
      // Flush del debounce: que el query del texto COMPLETO salga ya, y al
      // resolver se agrega el primer resultado (efecto de abajo).
      setDebouncedQ(q);
      setPendingPickQ(q);
      // Si veníamos en racha rápida, considéralo un escaneo y haz feedback visual.
      if (fastStreakRef.current >= 3) {
        setScanFlash(true);
        window.setTimeout(() => setScanFlash(false), 350);
      }
      fastStreakRef.current = 0;
    }
  };

  // Resuelve el Enter pendiente cuando el fetch del texto buscado termina.
  useEffect(() => {
    if (pendingPickQ === null) return;
    if (debouncedQ !== pendingPickQ) return; // el flush aún no aplicó
    if (products.isFetching || !products.data) return;
    const first = products.data.items[0];
    setPendingPickQ(null);
    if (first) {
      onPick(first);
      setQ('');
      setDebouncedQ('');
    } else {
      setNotFound(pendingPickQ);
      setQ('');
      setDebouncedQ('');
    }
  }, [pendingPickQ, debouncedQ, products.isFetching, products.data, onPick]);

  // Si seleccionas una categoría, vuelve al inicio del scroll.
  useEffect(() => {
    setQ('');
    setDebouncedQ('');
    setPendingPickQ(null);
    setNotFound(null);
  }, [categoryId]);

  return (
    <div className="space-y-3">
      {/* Input de búsqueda con afordancia de scanner */}
      <div className="relative">
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-sm transition-all',
            scanFlash
              ? 'border-emerald-400 ring-2 ring-emerald-200'
              : 'border-border/60 focus-within:border-brand-from/60 focus-within:ring-2 focus-within:ring-brand-from/20',
          )}
        >
          {scanFlash ? (
            <Barcode className="h-4 w-4 flex-shrink-0 text-emerald-600" />
          ) : (
            <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          )}
          <input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (notFound) setNotFound(null);
            }}
            onKeyDown={onKeyDown}
            placeholder="Busca por nombre, SKU o escanea un código de barras..."
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
          />
          <kbd className="hidden rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground sm:inline">
            /
          </kbd>
        </div>
        {notFound && (
          <p className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            No se encontró ningún producto para “{notFound}”. Verifica el código o
            búscalo por nombre.
          </p>
        )}
      </div>

      {/* Grid de productos */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.isLoading && (
          <div className="col-span-full py-10 text-center text-sm text-muted-foreground">
            Buscando...
          </div>
        )}
        {!products.isLoading && items.length === 0 && (
          <div className="col-span-full rounded-xl border-2 border-dashed border-border bg-card/50 py-10 text-center">
            <Package className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {q ? 'Sin resultados para tu búsqueda.' : 'Empieza a escribir o escanea un código...'}
            </p>
          </div>
        )}
        {items.map((p) => {
          const stockNum = Number(p.stock);
          const minNum = Number(p.minStock);
          const ignoreOwnStock = p.hasVariants || p.isKit;
          const low = !ignoreOwnStock && stockNum <= minNum && minNum > 0;
          const out = !ignoreOwnStock && stockNum <= 0;
          const stockLabel = ignoreOwnStock
            ? p.hasVariants
              ? 'Variantes'
              : 'Kit'
            : `Stock: ${formatQuantity(p.stock)}`;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p)}
              disabled={out}
              className={cn(
                'group relative flex flex-col rounded-xl border bg-card p-3 text-left transition-all',
                'hover:border-brand-from/40 hover:bg-brand-tint/30 hover:shadow-md hover:shadow-brand-from/10 hover:-translate-y-0.5',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0',
                out
                  ? 'border-rose-200 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/10'
                  : low
                  ? 'border-amber-200 dark:border-amber-900/40'
                  : 'border-border/60',
              )}
            >
              {/* Badge esquina superior derecha */}
              {out && (
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  <ZapOff className="h-2.5 w-2.5" />
                  Sin stock
                </span>
              )}
              {!out && low && (
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertCircle className="h-2.5 w-2.5" />
                  Bajo
                </span>
              )}
              {ignoreOwnStock && (
                <span className="absolute right-2 top-2 inline-flex items-center rounded-full bg-brand-tint px-1.5 py-0.5 text-[10px] font-semibold text-brand-from">
                  {p.hasVariants ? 'Variantes' : 'Kit'}
                </span>
              )}

              {/* Thumbnail */}
              <div className="mb-2 flex h-20 w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-brand-tint to-muted/40">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.style.display = 'none';
                      const fallback = img.nextElementSibling as HTMLElement | null;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <div
                  className="hidden h-full w-full items-center justify-center text-muted-foreground"
                  style={p.imageUrl ? { display: 'none' } : { display: 'flex' }}
                >
                  {p.imageUrl ? (
                    <ImageOff className="h-5 w-5 opacity-50" />
                  ) : (
                    <Package className="h-5 w-5 opacity-50" />
                  )}
                </div>
              </div>

              <span className="line-clamp-2 min-h-[2.4em] pr-14 text-sm font-medium text-foreground">
                {p.name}
              </span>
              <span className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {p.sku}
              </span>

              <div className="mt-2 flex w-full items-baseline justify-between gap-2">
                <span className="text-base font-bold tabular-nums text-foreground">
                  {formatMoney(p.salePrice)}
                  {p.soldByWeight && (
                    <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
                      /kg
                    </span>
                  )}
                </span>
                {!ignoreOwnStock && !out && !low && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {stockLabel}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
