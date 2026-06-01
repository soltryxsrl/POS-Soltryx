'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Input } from '@/shared/ui/controls/Input';
import { ConfirmDialog } from '@/shared/ui/feedback/ConfirmDialog';
import { DataTable, useTableQueryState, type DataTableColumn } from '@/shared/ui/data-table';
import {
  useDeletePromotion,
  usePromotions,
} from '../../application/hooks/use-promotions';
import type {
  Promotion,
  PromotionStatusFilter,
  PromotionType,
} from '../../domain/types';
import { PromotionFormDialog } from './PromotionFormDialog';

const TYPE_LABEL: Record<PromotionType, string> = {
  PRODUCT_PERCENT_OFF: '% off producto',
  PRODUCT_AMOUNT_OFF: 'RD$ off producto',
  PRODUCT_BUY_X_GET_Y: 'Compra X, lleva Y',
  ORDER_PERCENT_OFF: '% off orden',
  ORDER_AMOUNT_OFF: 'RD$ off orden',
};

const STATUS_CHIPS: Array<{ value: PromotionStatusFilter; label: string }> = [
  { value: 'active', label: 'Activa' },
  { value: 'scheduled', label: 'Programada' },
  { value: 'expired', label: 'Expirada' },
  { value: 'inactive', label: 'Inactiva' },
];

const STATUS_COLOR: Record<PromotionStatusFilter, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  scheduled: 'bg-blue-100 text-blue-800',
  expired: 'bg-amber-100 text-amber-800',
  inactive: 'bg-muted text-muted-foreground',
};

const FILTER_KEYS = ['q', 'status', 'from', 'to'] as const;

function describe(p: Promotion): string {
  if (p.type === 'PRODUCT_PERCENT_OFF') return `${p.percentOff}% off`;
  if (p.type === 'PRODUCT_AMOUNT_OFF')
    return `${formatMoney(p.amountOff ?? '0')} off por unidad`;
  if (p.type === 'PRODUCT_BUY_X_GET_Y')
    return `Compra ${p.minQuantity}, lleva ${p.freeQuantity} gratis`;
  if (p.type === 'ORDER_PERCENT_OFF')
    return `${p.percentOff}% off${p.minOrderTotal ? ` sobre RD$${p.minOrderTotal}` : ''}`;
  if (p.type === 'ORDER_AMOUNT_OFF')
    return `${formatMoney(p.amountOff ?? '0')} off${p.minOrderTotal ? ` sobre RD$${p.minOrderTotal}` : ''}`;
  return '';
}

function computeStatus(p: Promotion): PromotionStatusFilter {
  if (!p.isActive) return 'inactive';
  const now = Date.now();
  if (p.validUntil && new Date(p.validUntil).getTime() < now) return 'expired';
  if (p.validFrom && new Date(p.validFrom).getTime() > now) return 'scheduled';
  return 'active';
}

export function PromotionsTable() {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [deleting, setDeleting] = useState<Promotion | null>(null);
  const [delError, setDelError] = useState<string | null>(null);

  const table = useTableQueryState({
    defaultSort: 'createdAt',
    defaultSortDir: 'desc',
    filterKeys: FILTER_KEYS,
  });

  const promotions = usePromotions({
    q: table.filters.q || undefined,
    status: (table.filters.status as PromotionStatusFilter) || undefined,
    from: dateInputToIso(table.filters.from, 'start'),
    to: dateInputToIso(table.filters.to, 'end'),
    sort: table.sort,
    sortDir: table.sortDir,
    limit: table.pageSize,
    offset: (table.page - 1) * table.pageSize,
  });

  const del = useDeletePromotion();

  const columns = useMemo<DataTableColumn<Promotion>[]>(
    () => [
      {
        key: 'name',
        header: 'Nombre',
        sortable: true,
        render: (p) => (
          <>
            <div className="font-medium">{p.name}</div>
            {p.description && (
              <div className="text-[11px] text-muted-foreground">{p.description}</div>
            )}
          </>
        ),
      },
      {
        key: 'type',
        header: 'Tipo',
        render: (p) => <span className="text-xs">{TYPE_LABEL[p.type] ?? p.type}</span>,
      },
      {
        key: 'detail',
        header: 'Detalle',
        render: (p) => <span className="text-xs">{describe(p)}</span>,
      },
      {
        key: 'validity',
        header: 'Vigencia',
        sortable: true,
        render: (p) => (
          <span className="text-xs text-muted-foreground">
            {p.validFrom ? formatDateTime(p.validFrom) : '—'}
            {' → '}
            {p.validUntil ? formatDateTime(p.validUntil) : 'Sin límite'}
          </span>
        ),
      },
      {
        key: 'priority',
        header: 'Prioridad',
        sortable: true,
        align: 'right',
        render: (p) => p.priority,
      },
      {
        key: 'status',
        header: 'Estado',
        align: 'center',
        render: (p) => {
          const status = computeStatus(p);
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[status]}`}
            >
              {STATUS_CHIPS.find((c) => c.value === status)?.label ?? status}
            </span>
          );
        },
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (p) => (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(p)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => {
                setDelError(null);
                setDeleting(p);
              }}
              disabled={del.isPending}
              className="inline-flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [del.isPending],
  );

  const hasFilters = FILTER_KEYS.some((k) => !!table.filters[k]);

  const sortMaps = (() => {
    // Map UI column key to backend sort key
    return { validity: 'validFrom' };
  })() as Record<string, string>;

  const handleSortChange = (key: string, dir: 'asc' | 'desc') => {
    table.setSort(sortMaps[key] ?? key, dir);
  };
  const uiSortKey = table.sort
    ? (Object.entries(sortMaps).find(([, v]) => v === table.sort)?.[0] ?? table.sort)
    : undefined;

  const toolbar = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nombre..."
          value={table.filterDraft.q ?? ''}
          onChange={(e) => table.setFilter('q', e.target.value)}
          className="w-64"
        />
        {STATUS_CHIPS.map((c) => (
          <Chip
            key={c.value}
            label={c.label}
            active={table.filterDraft.status === c.value}
            onClick={() =>
              table.setFilter('status', table.filterDraft.status === c.value ? undefined : c.value)
            }
          />
        ))}
        {hasFilters && (
          <button
            type="button"
            onClick={() => table.clearFilters()}
            className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nueva promoción
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Rango creación:</span>
        <Input
          type="date"
          value={table.filterDraft.from ?? ''}
          onChange={(e) => table.setFilter('from', e.target.value)}
          className="h-8 w-40 text-xs"
        />
        <span>—</span>
        <Input
          type="date"
          value={table.filterDraft.to ?? ''}
          onChange={(e) => table.setFilter('to', e.target.value)}
          className="h-8 w-40 text-xs"
        />
      </div>
    </div>
  );

  return (
    <>
      <DataTable<Promotion>
        columns={columns}
        rows={promotions.data?.items ?? []}
        total={promotions.data?.total ?? 0}
        rowKey={(p) => p.id}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        sortKey={uiSortKey}
        sortDir={table.sortDir}
        onSortChange={handleSortChange}
        isLoading={promotions.isLoading}
        isFetching={promotions.isFetching}
        errorMessage={promotions.isError ? getErrorMessage(promotions.error) : null}
        emptyState={
          hasFilters
            ? 'Sin resultados con esos filtros.'
            : 'Sin promociones todavía. Crea la primera con "Nueva promoción".'
        }
        toolbar={toolbar}
      />

      {showCreate && <PromotionFormDialog onClose={() => setShowCreate(false)} />}
      {editing && (
        <PromotionFormDialog promotion={editing} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <ConfirmDialog
          title="Eliminar promoción"
          message={
            <>
              ¿Eliminar <strong>{deleting.name}</strong>? Esta acción no se puede
              deshacer.
            </>
          }
          confirmLabel="Eliminar"
          destructive
          pending={del.isPending}
          error={delError}
          onConfirm={async () => {
            setDelError(null);
            try {
              await del.mutateAsync(deleting.id);
              setDeleting(null);
            } catch (e) {
              setDelError(getErrorMessage(e));
            }
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function Chip({
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
      className={
        active
          ? 'rounded-md border border-brand-from/60 bg-brand-from/10 px-2.5 py-1.5 text-xs font-medium text-foreground'
          : 'rounded-md border border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground'
      }
    >
      {label}
    </button>
  );
}

function dateInputToIso(value: string | undefined, bound: 'start' | 'end'): string | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  const date =
    bound === 'start'
      ? new Date(y, m - 1, d, 0, 0, 0, 0)
      : new Date(y, m - 1, d, 23, 59, 59, 999);
  return date.toISOString();
}
