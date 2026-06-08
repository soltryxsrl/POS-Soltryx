'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { dayKey, formatDayLabel, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { Button } from '@/shared/ui/controls/Button';
import { FilterPopover } from '@/shared/ui/controls/FilterPopover';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import {
  DataTable,
  useTableQueryState,
  type DataTableColumn,
} from '@/shared/ui/data-table';
import {
  useFiscalDocTypes,
  useFiscalDocuments,
  useVoidDocument,
} from '../../application/hooks/use-fiscal';
import type {
  FiscalDocumentListItem,
  FiscalDocumentStatus,
} from '../../domain/types';

const TIPO_ANULACION: Array<{ code: string; label: string }> = [
  { code: '01', label: '01 Deterioro de factura' },
  { code: '02', label: '02 Errores de impresión' },
  { code: '03', label: '03 Impresión defectuosa' },
  { code: '04', label: '04 Duplicidad de factura' },
  { code: '05', label: '05 Corrección de información' },
  { code: '06', label: '06 Cambio de productos' },
  { code: '07', label: '07 Devolución de productos' },
  { code: '08', label: '08 Omisión de productos' },
  { code: '09', label: '09 Errores en secuencia NCF' },
];

/** Botón para anular un comprobante standalone (NCF quemado → 608). */
function VoidButton({ doc }: { doc: FiscalDocumentListItem }) {
  const canVoid = useHasPermission('fiscal.sequences.manage');
  const voidDoc = useVoidDocument();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState('05');
  const [err, setErr] = useState<string | null>(null);

  // Solo comprobantes standalone (sin venta) y ISSUED se anulan vía 608.
  if (!canVoid || doc.saleId || doc.status !== 'ISSUED') return null;

  const onConfirm = async () => {
    setErr(null);
    try {
      await voidDoc.mutateAsync({ id: doc.id, voidType: tipo });
      setOpen(false);
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)} title="Anular comprobante">
        Anular
      </Button>
      {open && (
        <MaintenanceShell
          open
          onClose={() => setOpen(false)}
          title="Anular comprobante"
          size="sm"
        >
          <div className="space-y-4">
            <p className="font-mono text-xs text-muted-foreground">{doc.ncf}</p>
            <FormField label="Tipo de anulación (608)">
              <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPO_ANULACION.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </FormField>
            {err && <p className="text-xs text-destructive">{err}</p>}
            <FormFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={voidDoc.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={onConfirm}
                disabled={voidDoc.isPending}
              >
                {voidDoc.isPending ? 'Anulando…' : 'Anular'}
              </Button>
            </FormFooter>
          </div>
        </MaintenanceShell>
      )}
    </>
  );
}

const FILTER_KEYS = ['q', 'docType', 'status', 'from', 'to'] as const;

// Al agrupar traemos el dataset completo (los grupos se arman en el cliente).
// Tope de seguridad: si hay más comprobantes que esto, se agrupan los primeros N
// y el pie de tabla avisa que el resultado quedó truncado.
const GROUP_FETCH_CAP = 2000;

const STATUS_LABEL: Record<FiscalDocumentStatus, string> = {
  ISSUED: 'Emitido',
  PUBLISHED: 'Enviado a DGII',
  REJECTED: 'Rechazado',
  CANCELLED: 'Anulado',
};

const STATUS_CLASS: Record<FiscalDocumentStatus, string> = {
  ISSUED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  PUBLISHED: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  CANCELLED: 'bg-muted text-muted-foreground',
};

function formatIssueDate(iso: string): string {
  return new Date(iso).toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function FiscalDocumentsTable({
  fillHeight,
  title,
}: {
  fillHeight?: boolean;
  title?: ReactNode;
}) {
  const table = useTableQueryState({
    defaultSort: 'issueDate',
    defaultSortDir: 'desc',
    filterKeys: FILTER_KEYS,
  });
  const docTypes = useFiscalDocTypes();
  // Con agrupación activa traemos el dataset completo (hasta el tope), que el
  // hook arma paginando del lado del cliente; los grupos se arman en el cliente.
  // Sin agrupar, paginación normal del servidor.
  const grouping = !!table.groupBy;
  const docs = useFiscalDocuments(
    {
      q: table.filters.q || undefined,
      docType: table.filters.docType || undefined,
      status: (table.filters.status as FiscalDocumentStatus) || undefined,
      from: table.filters.from || undefined,
      to: table.filters.to || undefined,
      ...(grouping
        ? {}
        : { limit: table.pageSize, offset: (table.page - 1) * table.pageSize }),
    },
    { fetchAll: grouping, cap: GROUP_FETCH_CAP },
  );

  const columns = useMemo<DataTableColumn<FiscalDocumentListItem>[]>(
    () => [
      {
        key: 'ncf',
        header: 'NCF',
        render: (d) =>
          d.saleId ? (
            <Link
              href={`/sales/${d.saleId}`}
              className="font-mono text-xs font-medium text-brand-from hover:underline"
              title="Ir al detalle de la venta"
            >
              {d.ncf}
            </Link>
          ) : (
            <span className="font-mono text-xs font-medium">{d.ncf}</span>
          ),
      },
      {
        key: 'docType',
        header: 'Tipo',
        grouping: {
          key: (d) => d.docType,
          label: (key) => <span className="font-mono text-xs font-medium">{key}</span>,
          sortValue: (key) => key,
        },
        render: (d) => (
          <span className="font-mono text-xs font-medium">{d.docType}</span>
        ),
      },
      {
        key: 'issueDate',
        header: 'Emitido',
        grouping: {
          key: (d) => dayKey(d.issueDate),
          label: (key) => formatDayLabel(key),
          sortValue: (key) => key, // 'YYYY-MM-DD' ⇒ orden cronológico
        },
        render: (d) => (
          <span className="text-xs text-muted-foreground">
            {formatIssueDate(d.issueDate)}
          </span>
        ),
      },
      {
        key: 'buyer',
        header: 'Comprador',
        render: (d) => (
          <div className="min-w-0">
            <div className="line-clamp-1 text-xs font-medium">
              {d.buyerName ?? '—'}
            </div>
            {d.buyerRnc && (
              <div className="text-[10px] text-muted-foreground">
                RNC: {d.buyerRnc}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'total',
        header: 'Total',
        align: 'right',
        aggregate: (rows) => {
          const sum = rows.reduce((acc, d) => acc + Number(d.total), 0);
          return (
            <span className="text-sm font-medium tabular-nums">{formatMoney(sum)}</span>
          );
        },
        render: (d) => (
          <span className="text-sm font-medium tabular-nums">
            {formatMoney(d.total)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Estado',
        grouping: {
          key: (d) => d.status,
          label: (key) => (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                STATUS_CLASS[key as FiscalDocumentStatus]
              }`}
            >
              {STATUS_LABEL[key as FiscalDocumentStatus]}
            </span>
          ),
          sortValue: (key) => STATUS_LABEL[key as FiscalDocumentStatus] ?? key,
        },
        render: (d) => (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              STATUS_CLASS[d.status]
            }`}
          >
            {STATUS_LABEL[d.status]}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (d) => <VoidButton doc={d} />,
      },
    ],
    [],
  );

  const hasFilters = FILTER_KEYS.some((k) => !!table.filters[k]);
  // Filtros no-búsqueda activos (excluye 'q', que vive inline en la barra).
  const activeCount = FILTER_KEYS.filter((k) => k !== 'q' && !!table.filters[k]).length;

  const toolbar = (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Buscar por NCF, nombre o RNC..."
        value={table.filterDraft.q ?? ''}
        onChange={(e) => table.setFilter('q', e.target.value)}
        className="w-72"
      />
      <FilterPopover activeCount={activeCount} onClear={() => table.clearFilters()}>
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">Tipo</div>
          <Select
            value={table.filterDraft.docType ?? ''}
            onChange={(e) => table.setFilter('docType', e.target.value)}
            className="w-full"
          >
            <option value="">Todos los tipos</option>
            {docTypes.data
              ?.filter((dt) => dt.appliesTo === 'SALE' || dt.appliesTo === 'BOTH')
              .map((dt) => (
                <option key={dt.code} value={dt.code}>
                  {dt.code} — {dt.name}
                </option>
              ))}
          </Select>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">Estado</div>
          <Select
            value={table.filterDraft.status ?? ''}
            onChange={(e) => table.setFilter('status', e.target.value)}
            className="w-full"
          >
            <option value="">Todos los estados</option>
            <option value="ISSUED">Emitido</option>
            <option value="PUBLISHED">Enviado a DGII</option>
            <option value="REJECTED">Rechazado</option>
            <option value="CANCELLED">Anulado</option>
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
    <DataTable<FiscalDocumentListItem>
      columns={columns}
      rows={docs.data?.items ?? []}
      total={docs.data?.total ?? 0}
      rowKey={(d) => d.id}
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
      isLoading={docs.isLoading}
      isFetching={docs.isFetching}
      errorMessage={docs.isError ? getErrorMessage(docs.error) : null}
      emptyState={
        hasFilters
          ? 'Sin resultados con esos filtros.'
          : 'No hay comprobantes emitidos. Emite uno desde el POS seleccionando un tipo de comprobante al cobrar.'
      }
      title={title}
      toolbar={toolbar}
      fillHeight={fillHeight}
    />
  );
}
