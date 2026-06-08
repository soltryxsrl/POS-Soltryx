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
  /**
   * Marca la columna como AGRUPABLE (aparece en el control "Agrupar"). Define
   * cómo sacar la clave de grupo de cada fila, cómo etiquetar el encabezado del
   * grupo y, opcionalmente, por qué valor ordenar los grupos. Si ninguna columna
   * define `grouping`, el control "Agrupar" no se muestra.
   */
  grouping?: {
    /** Clave estable: filas con la misma clave caen en el mismo grupo. */
    key: (row: T) => string;
    /** Etiqueta del encabezado del grupo (recibe la clave y las filas del grupo). */
    label: (groupKey: string, rows: T[]) => ReactNode;
    /** Valor por el que se ORDENAN los grupos. Default: la propia clave. */
    sortValue?: (groupKey: string, rows: T[]) => string | number;
    /**
     * Nombre de la dimensión en el menú "Agrupar". Útil cuando se agrupa por un
     * dato que vive dentro de una columna con otro encabezado (p. ej. agrupar
     * por "Estado" desde la columna "Nombre"). Default: el `header` de la columna.
     */
    menuLabel?: ReactNode;
  };
  /**
   * Subtotal de esta columna mostrado en el encabezado de cada grupo, alineado
   * bajo su columna (p. ej. suma de Cantidad o de Importe).
   */
  aggregate?: (rows: T[]) => ReactNode;
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
  /**
   * Título slim de la pantalla, renderizado a la IZQUIERDA de la misma fila que
   * el `toolbar` (los filtros quedan a la derecha). Reemplaza al `SectionHeader`
   * grande en páginas de tabla para recuperar alto vertical.
   */
  title?: ReactNode;
  toolbar?: ReactNode;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;

  /**
   * Modo "alto completo": la tabla llena la altura disponible y su cuerpo
   * scrollea internamente (con el `thead` sticky) en vez de crecer y hacer
   * scrollear la página. El contenedor padre debe tener una altura definida
   * (ej. una columna flex de alto fijo). El toolbar y la paginación quedan
   * fijos arriba/abajo. Opt-in: por defecto la tabla crece como siempre.
   */
  fillHeight?: boolean;

  /**
   * Columna (su `key`) por la que se agrupan las filas actualmente. `undefined`
   * = sin agrupar. Solo aplica a columnas que definan `grouping`. Al agrupar, la
   * tabla agrupa las filas que tiene cargadas (el padre decide traerlas todas) y
   * oculta la paginación de filas.
   */
  groupBy?: string;
  /** Orden de los grupos (por su `sortValue`). Default `'asc'`. */
  groupDir?: SortDir;
  /**
   * Cambia la columna de agrupación (`undefined` = ninguna). Si no se pasa, el
   * control "Agrupar" no se muestra (aunque haya columnas agrupables).
   */
  onGroupByChange?: (key: string | undefined) => void;
  /** Cambia el orden de los grupos. */
  onGroupDirChange?: (dir: SortDir) => void;
}
