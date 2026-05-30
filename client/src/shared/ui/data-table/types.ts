import type { ReactNode } from 'react';

export type SortDir = 'asc' | 'desc';

export interface DataTableColumn<T> {
  /** Identificador único de la columna; usado como sortKey si `sortable`. */
  key: string;
  header: ReactNode;
  /** Si es ordenable, click en el header dispara onSortChange. */
  sortable?: boolean;
  /** Ancho CSS (`'120px'`, `'20%'`, etc.). */
  width?: string;
  align?: 'left' | 'right' | 'center';
  /** Render del valor de la celda para una fila. */
  render: (row: T) => ReactNode;
  /** Clase opcional para la celda (no para el header). */
  cellClassName?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  total: number;

  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];

  sortKey?: string;
  sortDir?: SortDir;
  onSortChange?: (key: string, dir: SortDir) => void;

  isLoading?: boolean;
  isFetching?: boolean;
  emptyState?: ReactNode;
  errorMessage?: string | null;
  toolbar?: ReactNode;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
}
