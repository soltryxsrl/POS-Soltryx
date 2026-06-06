'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { formatQuantity } from '@/shared/lib/format';
import { Input } from '@/shared/ui/controls/Input';
import { useProducts } from '@/features/products/application/hooks/use-products';
import type { Product, ProductTypeFilter } from '@/features/products/domain/types';

interface Props {
  /** Se llama al elegir un producto (click, Enter o tap). */
  onSelect: (product: Product) => void;
  /** Productos ya agregados: se ocultan de los resultados para no repetir. */
  excludeIds?: string[];
  /** Filtra el tipo de producto (p. ej. 'simple' para conteos/transferencias). */
  type?: ProductTypeFilter;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Muestra el stock de sistema a la derecha de cada opción (default true). */
  showStock?: boolean;
}

/**
 * Selector de producto tipo combobox: se escribe para buscar y se elige de un
 * dropdown flotante (se abre al enfocar), con navegación por teclado (↑/↓/Enter,
 * Esc para cerrar) y cierre al hacer click fuera. Escala con catálogos grandes
 * (búsqueda server-side vía `useProducts`, scopeada a la sucursal activa).
 */
export function ProductCombobox({
  onSelect,
  excludeIds = [],
  type,
  placeholder = 'Buscar producto por nombre o SKU…',
  disabled,
  autoFocus,
  showStock = true,
}: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const listId = useId();

  const found = useProducts({ q: q.trim() || undefined, type, limit: 8 });
  const exclude = new Set(excludeIds);
  const results = (found.data?.items ?? []).filter((p) => !exclude.has(p.id));

  // Cerrar al hacer click fuera del combobox.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Resetea el resaltado cuando cambian la búsqueda o los resultados.
  useEffect(() => setHighlight(0), [q, found.data]);

  // Mantiene visible la opción resaltada al navegar con el teclado.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${highlight}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const choose = (p: Product) => {
    onSelect(p);
    setQ('');
    setHighlight(0);
    // Cierra el dropdown para no tapar la fila recién agregada; el foco se
    // mantiene (el onMouseDown del item evita el blur), así escribir de nuevo
    // reabre la lista para agregar otro producto.
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && results[highlight]) {
        e.preventDefault();
        choose(results[highlight]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showDropdown = open && !disabled;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          autoFocus={autoFocus}
          disabled={disabled}
          value={q}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="pl-9"
        />
      </div>

      {showDropdown && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {found.isLoading && (
            <li className="px-3 py-2 text-sm text-muted-foreground">Buscando…</li>
          )}
          {!found.isLoading && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {q.trim() ? 'Sin coincidencias.' : 'Escribe para buscar…'}
            </li>
          )}
          {results.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === highlight} data-idx={i}>
              <button
                type="button"
                // Evita el blur del input antes de procesar el click.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition',
                  i === highlight ? 'bg-brand-tint text-brand-from' : 'hover:bg-muted/40',
                )}
              >
                <span className="min-w-0 truncate">
                  {p.name} <span className="text-xs text-muted-foreground">{p.sku}</span>
                </span>
                {showStock && (
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    sistema {formatQuantity(p.stock)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
