'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SortDir } from './types';

export interface TableQueryState {
  page: number;
  pageSize: number;
  sort?: string;
  sortDir?: SortDir;
  filters: Record<string, string>;
}

export interface UseTableQueryStateOptions {
  /** Prefijo para los query params (`?prefix.page=...`). Útil si hay >1 tabla en la misma página. */
  prefix?: string;
  defaultPageSize?: number;
  defaultSort?: string;
  defaultSortDir?: SortDir;
  /** Claves de filtros que se proyectan al URL. Cualquier filtro fuera de esta lista no se persiste. */
  filterKeys?: readonly string[];
  /** ms para debounce de cambios en filtros (no se aplica a sort/page). */
  filterDebounceMs?: number;
}

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_FILTER_DEBOUNCE_MS = 300;

/**
 * Estado de paginación/sort/filtros sincronizado con la URL.
 *
 * - `page`, `pageSize`, `sort`, `sortDir` y los filtros listados en `filterKeys`
 *   se persisten en query string para que refresh/back/links funcionen.
 * - Cambios de filtro se debouncean para no disparar fetch por cada tecla.
 * - Cambiar un filtro o el pageSize resetea `page` a 1 automáticamente.
 */
export function useTableQueryState({
  prefix = '',
  defaultPageSize = DEFAULT_PAGE_SIZE,
  defaultSort,
  defaultSortDir,
  filterKeys = [],
  filterDebounceMs = DEFAULT_FILTER_DEBOUNCE_MS,
}: UseTableQueryStateOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = useCallback((k: string) => (prefix ? `${prefix}.${k}` : k), [prefix]);

  const urlState = useMemo<TableQueryState>(() => {
    const pageRaw = Number(searchParams.get(key('page')));
    const sizeRaw = Number(searchParams.get(key('pageSize')));
    const sort = searchParams.get(key('sort')) ?? defaultSort;
    const sortDirRaw = searchParams.get(key('sortDir')) as SortDir | null;
    const filters: Record<string, string> = {};
    for (const fk of filterKeys) {
      const v = searchParams.get(key(fk));
      if (v != null && v !== '') filters[fk] = v;
    }
    return {
      page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
      pageSize:
        Number.isFinite(sizeRaw) && sizeRaw > 0 ? sizeRaw : defaultPageSize,
      sort: sort ?? undefined,
      sortDir: sortDirRaw === 'asc' || sortDirRaw === 'desc' ? sortDirRaw : defaultSortDir,
      filters,
    };
  }, [searchParams, key, filterKeys, defaultPageSize, defaultSort, defaultSortDir]);

  // Espejo local de filtros para responder a typing sin latencia.
  // El URL se actualiza tras debounce.
  const [filterDraft, setFilterDraft] = useState<Record<string, string>>(
    urlState.filters,
  );
  const draftRef = useRef(filterDraft);
  draftRef.current = filterDraft;

  // Si el URL cambia desde afuera (botón back, navegación), re-sincronizamos draft.
  useEffect(() => {
    setFilterDraft(urlState.filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(urlState.filters)]);

  const writeToUrl = useCallback(
    (patch: Partial<TableQueryState> & { filters?: Record<string, string> }) => {
      const params = new URLSearchParams(searchParams.toString());
      const merged: TableQueryState = {
        ...urlState,
        ...patch,
        filters: {
          ...urlState.filters,
          ...(patch.filters ?? {}),
        },
      };

      const set = (k: string, v: string | undefined) => {
        if (v == null || v === '') params.delete(key(k));
        else params.set(key(k), v);
      };

      set('page', merged.page === 1 ? undefined : String(merged.page));
      set(
        'pageSize',
        merged.pageSize === defaultPageSize ? undefined : String(merged.pageSize),
      );
      set('sort', merged.sort === defaultSort ? undefined : merged.sort);
      set(
        'sortDir',
        merged.sortDir === defaultSortDir ? undefined : merged.sortDir,
      );
      for (const fk of filterKeys) {
        set(fk, merged.filters[fk]);
      }

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [
      router,
      pathname,
      searchParams,
      key,
      urlState,
      defaultPageSize,
      defaultSort,
      defaultSortDir,
      filterKeys,
    ],
  );

  // Debounce push de filtros al URL.
  useEffect(() => {
    const same = filterKeys.every(
      (k) => (filterDraft[k] ?? '') === (urlState.filters[k] ?? ''),
    );
    if (same) return;
    const t = setTimeout(() => {
      writeToUrl({ page: 1, filters: filterDraft });
    }, filterDebounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDraft, filterDebounceMs]);

  const setPage = useCallback(
    (page: number) => writeToUrl({ page }),
    [writeToUrl],
  );

  const setPageSize = useCallback(
    (pageSize: number) => writeToUrl({ pageSize, page: 1 }),
    [writeToUrl],
  );

  const setSort = useCallback(
    (sort: string, sortDir: SortDir) =>
      writeToUrl({ sort, sortDir, page: 1 }),
    [writeToUrl],
  );

  const setFilter = useCallback((k: string, value: string | undefined) => {
    setFilterDraft((prev) => {
      const next = { ...prev };
      if (value == null || value === '') delete next[k];
      else next[k] = value;
      return next;
    });
  }, []);

  const setFilters = useCallback((next: Record<string, string>) => {
    setFilterDraft(next);
  }, []);

  const clearFilters = useCallback(() => {
    setFilterDraft({});
  }, []);

  return {
    // Estado efectivo (lo que se envía al server)
    page: urlState.page,
    pageSize: urlState.pageSize,
    sort: urlState.sort,
    sortDir: urlState.sortDir,
    filters: urlState.filters,

    // Estado del draft (para inputs controlados)
    filterDraft,

    // Setters
    setPage,
    setPageSize,
    setSort,
    setFilter,
    setFilters,
    clearFilters,
  };
}
