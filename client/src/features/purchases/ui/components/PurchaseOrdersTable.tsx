'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Printer, Receipt } from 'lucide-react';
import { dayKey, formatDateTime, formatDayLabel, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Fab } from '@/shared/ui/controls/Fab';
import { FilterPopover } from '@/shared/ui/controls/FilterPopover';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { DataTable, useTableQueryState, type DataTableColumn } from '@/shared/ui/data-table';
import { useSuppliers } from '@/features/suppliers/application/hooks/use-suppliers';
import { useReceiptBusinessInfo } from '@/features/config/application/hooks/use-business-info';
import { printReceiptLetter } from '@/features/sales/ui/components/printReceiptLetter';
import { usePurchaseOrders } from '../../application/hooks/use-purchases';
import type { PurchaseOrder, PurchaseOrderStatus } from '../../domain/types';
import { PurchaseFiscalDialog } from './PurchaseFiscalDialog';
import { PurchaseOrderLetter } from './PurchaseOrderLetter';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PARTIAL: 'bg-blue-100 text-blue-800',
  RECEIVED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-muted text-muted-foreground',
};

const STATUSES: PurchaseOrderStatus[] = ['PENDING', 'PARTIAL', 'RECEIVED', 'CANCELLED'];

const FILTER_KEYS = ['q', 'status', 'supplierId', 'from', 'to'] as const;

// Al agrupar traemos el dataset completo (los grupos se arman en el cliente).
// Tope de seguridad: si hay más órdenes que esto, se agrupan las primeras N y el
// pie de tabla avisa que el resultado quedó truncado.
const GROUP_FETCH_CAP = 2000;

export function PurchaseOrdersTable({
  fillHeight,
  title,
}: {
  fillHeight?: boolean;
  title?: ReactNode;
}) {
  const router = useRouter();
  const [printing, setPrinting] = useState<PurchaseOrder | null>(null);
  const [fiscalOrder, setFiscalOrder] = useState<PurchaseOrder | null>(null);
  const table = useTableQueryState({
    defaultSort: 'createdAt',
    defaultSortDir: 'desc',
    filterKeys: FILTER_KEYS,
  });

  // Con agrupación activa traemos el dataset completo (hasta el tope), que el
  // hook arma paginando del lado del cliente (el backend topa cada request en
  // 200). Sin agrupar, paginación normal del servidor.
  const grouping = !!table.groupBy;
  const orders = usePurchaseOrders(
    {
      q: table.filters.q || undefined,
      status: (table.filters.status as PurchaseOrderStatus) || undefined,
      supplierId: table.filters.supplierId || undefined,
      from: dateInputToIso(table.filters.from, 'start'),
      to: dateInputToIso(table.filters.to, 'end'),
      sort: table.sort,
      sortDir: table.sortDir,
      ...(grouping
        ? {}
        : { limit: table.pageSize, offset: (table.page - 1) * table.pageSize }),
    },
    { fetchAll: grouping, cap: GROUP_FETCH_CAP },
  );

  const suppliers = useSuppliers({ isActive: 'true', limit: 200 });

  const columns = useMemo<DataTableColumn<PurchaseOrder>[]>(
    () => [
      {
        key: 'orderNumber',
        header: 'N°',
        sortable: true,
        render: (po) => <span className="font-mono text-xs">{po.orderNumber}</span>,
      },
      {
        key: 'supplier',
        header: 'Proveedor',
        grouping: {
          key: (po) => po.supplierId,
          label: (_key, rows) => rows[0].supplierName,
          sortValue: (_key, rows) => rows[0].supplierName ?? '',
        },
        render: (po) => po.supplierName,
      },
      {
        key: 'createdAt',
        header: 'Fecha',
        sortable: true,
        grouping: {
          key: (po) => dayKey(po.createdAt),
          label: (key) => formatDayLabel(key),
          sortValue: (key) => key, // 'YYYY-MM-DD' ⇒ orden cronológico
        },
        render: (po) => <span className="text-xs">{formatDateTime(po.createdAt)}</span>,
      },
      {
        key: 'lines',
        header: 'Líneas',
        align: 'right',
        aggregate: (rows) => {
          const sum = rows.reduce((acc, po) => acc + po.items.length, 0);
          return <span className="font-medium">{sum}</span>;
        },
        render: (po) => po.items.length,
      },
      {
        key: 'total',
        header: 'Total',
        sortable: true,
        align: 'right',
        aggregate: (rows) => {
          const sum = rows.reduce((acc, po) => acc + Number(po.total), 0);
          return <span className="font-medium">{formatMoney(sum)}</span>;
        },
        render: (po) => <span className="font-medium">{formatMoney(po.total)}</span>,
      },
      {
        key: 'status',
        header: 'Estado',
        grouping: {
          key: (po) => po.status,
          label: (key) => (
            <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[key] ?? ''}`}>
              {STATUS_LABEL[key] ?? key}
            </span>
          ),
          sortValue: (key) => STATUS_LABEL[key] ?? key,
        },
        render: (po) => (
          <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[po.status] ?? ''}`}>
            {STATUS_LABEL[po.status] ?? po.status}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (po) => (
          <div className="flex items-center justify-end gap-1">
            {po.status !== 'CANCELLED' && (
              <button
                type="button"
                title={
                  po.supplierNcf
                    ? 'Comprobante 606 (editar)'
                    : 'Sin comprobante — esta compra no entra al 606'
                }
                aria-label="Comprobante fiscal 606"
                onClick={() => setFiscalOrder(po)}
                className={`rounded-md p-1.5 transition hover:bg-muted ${
                  po.supplierNcf
                    ? 'text-muted-foreground hover:text-foreground'
                    : 'text-amber-600 hover:text-amber-700'
                }`}
              >
                <Receipt className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              title="Imprimir (formato Carta)"
              aria-label="Imprimir orden"
              onClick={() => setPrinting(po)}
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Printer className="h-4 w-4" />
            </button>
            <Link
              href={`/purchases/${po.id}`}
              className="text-xs text-primary hover:underline"
            >
              Ver
            </Link>
          </div>
        ),
      },
    ],
    // setPrinting es estable (setter de useState); las columnas no dependen de otro estado.
    [],
  );

  const hasFilters = FILTER_KEYS.some((k) => !!table.filters[k]);
  const activeCount = FILTER_KEYS.filter((k) => k !== 'q' && !!table.filters[k]).length;

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Buscar # de orden..."
        value={table.filterDraft.q ?? ''}
        onChange={(e) => table.setFilter('q', e.target.value)}
        className="w-56"
      />
      <FilterPopover activeCount={activeCount} onClear={() => table.clearFilters()}>
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">Estado</div>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <Chip
                key={s}
                label={STATUS_LABEL[s]}
                active={table.filterDraft.status === s}
                onClick={() =>
                  table.setFilter('status', table.filterDraft.status === s ? undefined : s)
                }
              />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">Proveedor</div>
          <Select
            value={table.filterDraft.supplierId ?? ''}
            onChange={(e) => table.setFilter('supplierId', e.target.value)}
            className="w-full"
          >
            <option value="">Todos los proveedores</option>
            {suppliers.data?.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.tradeName}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">Rango de fecha</div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={table.filterDraft.from ?? ''}
              onChange={(e) => table.setFilter('from', e.target.value)}
              className="h-8 min-w-0 flex-1 text-xs"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="date"
              value={table.filterDraft.to ?? ''}
              onChange={(e) => table.setFilter('to', e.target.value)}
              className="h-8 min-w-0 flex-1 text-xs"
            />
          </div>
        </div>
      </FilterPopover>
    </div>
  );

  return (
    <>
      <DataTable<PurchaseOrder>
        columns={columns}
        rows={orders.data?.items ?? []}
        total={orders.data?.total ?? 0}
        rowKey={(po) => po.id}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        sortKey={table.sort}
        sortDir={table.sortDir}
        onSortChange={table.setSort}
        groupBy={table.groupBy}
        groupDir={table.groupDir}
        onGroupByChange={table.setGroupBy}
        onGroupDirChange={table.setGroupDir}
        isLoading={orders.isLoading}
        isFetching={orders.isFetching}
        errorMessage={orders.isError ? getErrorMessage(orders.error) : null}
        emptyState={
          hasFilters
            ? 'Sin resultados con esos filtros.'
            : 'Sin órdenes todavía. Crea la primera con "Nueva orden".'
        }
        title={title}
        toolbar={toolbar}
        fillHeight={fillHeight}
      />

      <Fab label="Nueva orden" onClick={() => router.push('/purchases/new')} />

      {printing && (
        <PurchaseOrderPrinter po={printing} onDone={() => setPrinting(null)} />
      )}

      {fiscalOrder && (
        <PurchaseFiscalDialog order={fiscalOrder} onClose={() => setFiscalOrder(null)} />
      )}
    </>
  );
}

/**
 * Renderiza la orden en formato Carta fuera de pantalla y dispara la impresión
 * (mismo impresor que el recibo de venta en Carta). Vive como componente propio
 * porque necesita el hook `useReceiptBusinessInfo` para el encabezado del negocio
 * y debe esperar a que cargue antes de imprimir.
 */
function PurchaseOrderPrinter({
  po,
  onDone,
}: {
  po: PurchaseOrder;
  onDone: () => void;
}) {
  const business = useReceiptBusinessInfo(po.branchId ?? undefined);
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    // Espera a que el negocio cargue (éxito o error → cae al fallback) para no
    // imprimir un encabezado a medias.
    if (business.isLoading) return;
    fired.current = true;
    printReceiptLetter(
      ref.current?.querySelector('.receipt-letter') ?? null,
      `Orden de compra ${po.orderNumber}`,
    );
    onDone();
  }, [business.isLoading, onDone, po]);

  return (
    <div
      ref={ref}
      aria-hidden
      style={{ position: 'fixed', left: '-10000px', top: 0, width: '816px' }}
    >
      <PurchaseOrderLetter po={po} business={business.data ?? undefined} />
    </div>
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
