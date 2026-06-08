'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Layers,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { DataTableColumn, DataTableProps, SortDir } from './types';

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
  groupBy,
  groupDir = 'asc',
  onGroupByChange,
  onGroupDirChange,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  // ----- Agrupación de filas (estilo Wrike / "Agrupar por") -----
  const groupableColumns = columns.filter((c) => c.grouping);
  const activeGroupCol =
    groupBy != null ? columns.find((c) => c.key === groupBy && c.grouping) : undefined;
  const grouped = !!activeGroupCol;

  // Colapso por grupo (estado de vista, vive en el componente).
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(() => new Set());
  const toggleGroupRow = (k: string) =>
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  // Construye y ordena los grupos a partir de las filas YA cargadas. El padre se
  // encarga de traer el dataset completo cuando hay agrupación; aquí solo se
  // agrupa lo recibido.
  const groups = (() => {
    if (!activeGroupCol?.grouping) return [];
    const g = activeGroupCol.grouping;
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const k = g.key(row);
      const arr = map.get(k);
      if (arr) arr.push(row);
      else map.set(k, [row]);
    }
    const list = [...map.entries()].map(([key, gRows]) => ({
      key,
      rows: gRows,
      sortVal: g.sortValue ? g.sortValue(key, gRows) : key,
    }));
    list.sort((a, b) => {
      const cmp =
        typeof a.sortVal === 'number' && typeof b.sortVal === 'number'
          ? a.sortVal - b.sortVal
          : String(a.sortVal).localeCompare(String(b.sortVal), 'es', { numeric: true });
      return groupDir === 'desc' ? -cmp : cmp;
    });
    return list;
  })();

  // Si no se cargó todo el dataset (se alcanzó el tope del padre), los conteos y
  // subtotales de CADA grupo son potencialmente PARCIALES — se marcan en ámbar y
  // con `≈` para no leerse como cifras finales.
  const groupsPartial = grouped && rows.length < total;

  // Fila de encabezado: con `title` se vuelve una barra slim "título … filtros"
  // (justify-between); sin título, son los controles tal cual (comportamiento previo).
  const groupControl =
    onGroupByChange && groupableColumns.length > 0 ? (
      <GroupControl
        columns={groupableColumns}
        groupBy={groupBy}
        groupDir={groupDir}
        onGroupByChange={onGroupByChange}
        onGroupDirChange={onGroupDirChange}
      />
    ) : null;

  const rightControls =
    groupControl || toolbar ? (
      <div className="flex flex-wrap items-center gap-2">
        {groupControl}
        {toolbar}
      </div>
    ) : null;

  const headerContent = title ? (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
      {rightControls}
    </div>
  ) : (
    rightControls
  );

  const handleSortClick = (col: (typeof columns)[number]) => {
    if (!col.sortable || !onSortChange) return;
    const nextDir: SortDir =
      sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc';
    onSortChange(col.key, nextDir);
  };

  // Render de una fila de datos; reutilizado por la vista plana y la agrupada.
  // `indent` agrega sangría al primer celda cuando la fila vive bajo un grupo.
  const renderDataRow = (row: T, indent = false) => (
    <tr
      key={rowKey(row)}
      onClick={onRowClick ? () => onRowClick(row) : undefined}
      className={cn(
        'border-b last:border-0',
        onRowClick && 'cursor-pointer hover:bg-muted/40',
      )}
    >
      {columns.map((col, idx) => (
        <td
          key={col.key}
          className={cn(
            'px-4 py-2',
            col.align === 'right' && 'text-right',
            col.align === 'center' && 'text-center',
            indent && idx === 0 && 'pl-10',
            col.cellClassName,
          )}
        >
          {col.render(row)}
        </td>
      ))}
    </tr>
  );

  return (
    <div className={fillHeight ? 'flex min-h-0 flex-1 flex-col gap-3' : 'space-y-3'}>
      {(title || rightControls) &&
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
              ) : grouped ? (
                groups.flatMap((grp) => {
                  const collapsed = collapsedKeys.has(grp.key);
                  const headerRow = (
                    <tr
                      key={`group-${grp.key}`}
                      onClick={() => toggleGroupRow(grp.key)}
                      className="cursor-pointer border-b bg-muted/40 hover:bg-muted/60"
                    >
                      {columns.map((col, idx) => (
                        <td
                          key={col.key}
                          className={cn(
                            'px-4 py-2',
                            col.align === 'right' && 'text-right',
                            col.align === 'center' && 'text-center',
                          )}
                        >
                          {idx === 0 ? (
                            <div className="flex items-center gap-2 font-semibold text-foreground">
                              <ChevronRight
                                className={cn(
                                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                                  !collapsed && 'rotate-90',
                                )}
                              />
                              <span className="truncate">
                                {activeGroupCol!.grouping!.label(grp.key, grp.rows)}
                              </span>
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-xs font-medium',
                                  groupsPartial
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-background text-muted-foreground',
                                )}
                                title={
                                  groupsPartial
                                    ? 'Conteo parcial: la agrupación está limitada al tope'
                                    : undefined
                                }
                              >
                                {grp.rows.length}
                              </span>
                            </div>
                          ) : col.aggregate ? (
                            <span
                              className={cn('font-medium', groupsPartial && 'text-amber-600')}
                              title={
                                groupsPartial
                                  ? 'Subtotal parcial: faltan filas por el tope; afina los filtros'
                                  : undefined
                              }
                            >
                              {groupsPartial ? '≈ ' : ''}
                              {col.aggregate(grp.rows)}
                            </span>
                          ) : null}
                        </td>
                      ))}
                    </tr>
                  );
                  return [
                    headerRow,
                    ...(collapsed ? [] : grp.rows.map((row) => renderDataRow(row, true))),
                  ];
                })
              ) : (
                rows.map((row) => renderDataRow(row))
              )}
            </tbody>
          </table>
        </div>
        {grouped ? (
          <GroupedFooter
            total={total}
            loaded={rows.length}
            groupCount={groups.length}
            onCollapseAll={() => setCollapsedKeys(new Set(groups.map((g) => g.key)))}
            onExpandAll={() => setCollapsedKeys(new Set())}
          />
        ) : (
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
        )}
      </div>
    </div>
  );
}

// ----- Control "Agrupar" (botón + popover) -----

function GroupControl<T>({
  columns,
  groupBy,
  groupDir,
  onGroupByChange,
  onGroupDirChange,
}: {
  columns: DataTableColumn<T>[];
  groupBy?: string;
  groupDir: SortDir;
  onGroupByChange: (key: string | undefined) => void;
  onGroupDirChange?: (dir: SortDir) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const active = columns.find((c) => c.key === groupBy);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition',
          active
            ? 'border-brand-from/60 bg-brand-from/10 text-brand-from'
            : 'border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <Layers className="h-4 w-4" />
        {active ? (
          <span className="inline-flex items-center gap-1">
            Agrupado:{' '}
            <span className="font-semibold">{active.grouping?.menuLabel ?? active.header}</span>
          </span>
        ) : (
          'Agrupar'
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Agrupar"
          className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-xl"
        >
          <div className="px-2 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Agrupar por
          </div>
          <ul className="space-y-0.5">
            <li>
              <GroupOption
                label="Ninguno"
                active={!groupBy}
                onClick={() => {
                  onGroupByChange(undefined);
                  setOpen(false);
                }}
              />
            </li>
            {columns.map((c) => (
              <li key={c.key}>
                <GroupOption
                  label={c.grouping?.menuLabel ?? c.header}
                  active={groupBy === c.key}
                  onClick={() => onGroupByChange(c.key)}
                />
              </li>
            ))}
          </ul>
          {groupBy && onGroupDirChange && (
            <>
              <div className="mt-2 border-t px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ordenar grupos
              </div>
              <div className="flex gap-1 px-1 pb-0.5">
                <DirChip
                  label="Ascendente"
                  active={groupDir === 'asc'}
                  onClick={() => onGroupDirChange('asc')}
                />
                <DirChip
                  label="Descendente"
                  active={groupDir === 'desc'}
                  onClick={() => onGroupDirChange('desc')}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function GroupOption({
  label,
  active,
  onClick,
}: {
  label: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition',
        active
          ? 'bg-brand-from/10 text-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <span className="truncate">{label}</span>
      {active && <Check className="h-3.5 w-3.5 shrink-0 text-brand-from" />}
    </button>
  );
}

function DirChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded-md border px-2 py-1 text-xs transition',
        active
          ? 'border-brand-from/60 bg-brand-from/10 text-foreground'
          : 'border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {label}
    </button>
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

// Pie de la tabla en modo agrupado: sin paginación de filas (el padre trae el
// dataset completo). Muestra el resumen y atajos para colapsar/expandir todo.
// Si `loaded < total`, advierte que la agrupación está truncada por el tope.
function GroupedFooter({
  total,
  loaded,
  groupCount,
  onCollapseAll,
  onExpandAll,
}: {
  total: number;
  loaded: number;
  groupCount: number;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}) {
  const truncated = loaded < total;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2 text-xs text-muted-foreground">
      <div className={cn(truncated && 'text-amber-600')}>
        {total === 0
          ? 'Sin resultados'
          : truncated
            ? `Agrupando las primeras ${loaded} de ${total} — afina los filtros para incluir todo`
            : `${total} ${total === 1 ? 'fila' : 'filas'} en ${groupCount} ${
                groupCount === 1 ? 'grupo' : 'grupos'
              }`}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onExpandAll}
          className="transition hover:text-foreground"
        >
          Expandir todo
        </button>
        <button
          type="button"
          onClick={onCollapseAll}
          className="transition hover:text-foreground"
        >
          Colapsar todo
        </button>
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
