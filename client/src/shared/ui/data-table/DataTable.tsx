'use client';

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { DataTableProps, SortDir } from './types';

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function DataTable<T>({
  columns,
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  sortKey,
  sortDir,
  onSortChange,
  isLoading = false,
  isFetching = false,
  emptyState,
  errorMessage,
  title,
  toolbar,
  onRowClick,
  rowKey,
  fillHeight = false,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  // Fila de encabezado: con `title` se vuelve una barra slim "título … filtros"
  // (justify-between); sin título, es el toolbar tal cual (comportamiento previo).
  const headerContent = title ? (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
      {toolbar}
    </div>
  ) : (
    toolbar
  );

  const handleSortClick = (col: (typeof columns)[number]) => {
    if (!col.sortable || !onSortChange) return;
    const nextDir: SortDir =
      sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc';
    onSortChange(col.key, nextDir);
  };

  // Agrupación de columnas: recorre `columns` EN ORDEN juntando columnas
  // consecutivas con la misma etiqueta `group`. Cada segmento es o un grupo
  // (varias columnas bajo una cabecera) o una columna suelta (sin `group`).
  const hasGroups = columns.some((c) => c.group);
  const segments: Array<{ group?: string; cols: typeof columns }> = [];
  for (const col of columns) {
    const last = segments[segments.length - 1];
    if (col.group && last && last.group === col.group) {
      last.cols.push(col);
    } else {
      segments.push({ group: col.group, cols: [col] });
    }
  }
  // Claves de la primera columna de cada segmento (menos el primero): ahí va el
  // divisor vertical que se prolonga por el cuerpo de la tabla.
  const dividerKeys = new Set<string>(segments.slice(1).map((s) => s.cols[0].key));

  // Render del `<th>` de una columna; reutilizado por el header de una fila y
  // por la fila inferior del header agrupado. `rowSpan`/divisor son opcionales.
  const renderColumnHeader = (
    col: (typeof columns)[number],
    opts: { rowSpan?: number; divider?: boolean } = {},
  ) => {
    const isSorted = col.sortable && sortKey === col.key;
    return (
      <th
        key={col.key}
        rowSpan={opts.rowSpan}
        style={col.width ? { width: col.width } : undefined}
        className={cn(
          'px-4 py-2 font-medium select-none',
          col.align === 'right' && 'text-right',
          col.align === 'center' && 'text-center',
          col.sortable && 'cursor-pointer hover:text-foreground',
          opts.divider && 'border-l',
        )}
        onClick={() => handleSortClick(col)}
      >
        <span
          className={cn(
            'inline-flex items-center gap-1',
            col.align === 'right' && 'flex-row-reverse',
          )}
        >
          {col.header}
          {col.sortable && (
            <span className="inline-flex flex-col leading-none text-muted-foreground/60">
              {isSorted ? (
                sortDir === 'asc' ? (
                  <ChevronUp className="h-3 w-3 text-foreground" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-foreground" />
                )
              ) : (
                <ChevronDown className="h-3 w-3 opacity-40" />
              )}
            </span>
          )}
        </span>
      </th>
    );
  };

  return (
    <div className={fillHeight ? 'flex min-h-0 flex-1 flex-col gap-3' : 'space-y-3'}>
      {(title || toolbar) &&
        // En modo fillHeight el encabezado ya queda fijo arriba (vive fuera de la
        // zona que scrollea), así que no necesita `sticky`. En modo normal lo
        // dejamos pegado para tablas largas que hacen scrollear la página:
        // fondo translúcido + blur para enmascarar lo que pasa por detrás.
        // z-20 < diálogos (z-50) y Fab (z-40).
        (fillHeight ? (
          <div>{headerContent}</div>
        ) : (
          <div className="sticky top-0 z-20 bg-card/90 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/70">
            {headerContent}
          </div>
        ))}
      <div
        className={cn(
          'relative rounded-lg border bg-card',
          fillHeight && 'flex min-h-0 flex-1 flex-col',
        )}
      >
        {isFetching && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-start justify-center pt-2 pointer-events-none">
            <span className="rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow-sm border">
              Cargando…
            </span>
          </div>
        )}
        <div className={cn('overflow-x-auto', fillHeight && 'min-h-0 flex-1 overflow-y-auto')}>
          <table className="w-full text-sm">
            <thead
              className={cn(
                'border-b text-left text-xs text-muted-foreground',
                fillHeight && 'sticky top-0 z-10 bg-card',
              )}
            >
              <tr>
                {columns.map((col) => {
                  const isSorted = col.sortable && sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      style={col.width ? { width: col.width } : undefined}
                      className={cn(
                        'px-4 py-2 font-medium select-none',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.sortable && 'cursor-pointer hover:text-foreground',
                      )}
                      onClick={() => handleSortClick(col)}
                    >
                      <span
                        className={cn(
                          'inline-flex items-center gap-1',
                          col.align === 'right' && 'flex-row-reverse',
                        )}
                      >
                        {col.header}
                        {col.sortable && (
                          <span className="inline-flex flex-col leading-none text-muted-foreground/60">
                            {isSorted ? (
                              sortDir === 'asc' ? (
                                <ChevronUp className="h-3 w-3 text-foreground" />
                              ) : (
                                <ChevronDown className="h-3 w-3 text-foreground" />
                              )
                            ) : (
                              <ChevronDown className="h-3 w-3 opacity-40" />
                            )}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Cargando…
                  </td>
                </tr>
              ) : errorMessage ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-destructive"
                  >
                    {errorMessage}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    {emptyState ?? 'No hay resultados.'}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b last:border-0',
                      onRowClick && 'cursor-pointer hover:bg-muted/40',
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-2',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.cellClassName,
                        )}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <DataTableFooter
          total={total}
          from={from}
          to={to}
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}

interface FooterProps {
  total: number;
  from: number;
  to: number;
  page: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

function DataTableFooter({
  total,
  from,
  to,
  page,
  totalPages,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: FooterProps) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2 text-xs text-muted-foreground">
      <div>
        {total === 0 ? 'Sin resultados' : `Mostrando ${from}–${to} de ${total}`}
      </div>
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-2">
            <span>Por página</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs outline-none focus:border-brand-from/60 focus:ring-2 focus:ring-brand-from/20"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1">
          <IconButton
            disabled={!canPrev}
            onClick={() => onPageChange(1)}
            title="Primera página"
            aria-label="Primera página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </IconButton>
          <IconButton
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
            title="Página anterior"
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <span className="px-2 tabular-nums">
            {page} / {totalPages}
          </span>
          <IconButton
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
            title="Página siguiente"
            aria-label="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </IconButton>
          <IconButton
            disabled={!canNext}
            onClick={() => onPageChange(totalPages)}
            title="Última página"
            aria-label="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  children,
  disabled,
  onClick,
  title,
  ...rest
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
      {...rest}
    >
      {children}
    </button>
  );
}
