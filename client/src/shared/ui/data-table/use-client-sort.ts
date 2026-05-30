'use client';

import { useMemo, useState } from 'react';
import type { SortDir } from './types';

/**
 * Sort client-side para datasets chicos. No persiste en URL.
 * Devuelve filas ordenadas y el estado/setter compatibles con DataTable.
 */
export function useClientSort<T>(
  rows: T[] | undefined,
  defaultSort?: string,
  defaultSortDir: SortDir = 'asc',
  getValue?: (row: T, key: string) => unknown,
) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSort);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);

  const sorted = useMemo(() => {
    if (!rows) return [];
    if (!sortKey) return rows;
    const accessor =
      getValue ?? ((row: T, key: string) => (row as Record<string, unknown>)[key]);
    const factor = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = accessor(a, sortKey);
      const vb = accessor(b, sortKey);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return -1 * factor;
      if (sa > sb) return 1 * factor;
      return 0;
    });
  }, [rows, sortKey, sortDir, getValue]);

  const onSortChange = (key: string, dir: SortDir) => {
    setSortKey(key);
    setSortDir(dir);
  };

  return { sorted, sortKey, sortDir, onSortChange };
}
