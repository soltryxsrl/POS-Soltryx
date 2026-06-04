'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Layers, Package, Pencil, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { formatMoney, formatQuantity } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { Fab } from '@/shared/ui/controls/Fab';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { StatusFilter } from '@/shared/ui/controls/StatusFilter';
import { ConfirmDialog } from '@/shared/ui/feedback/ConfirmDialog';
import { DataTable, useTableQueryState, type DataTableColumn } from '@/shared/ui/data-table';
import { useCategories } from '@/features/categories/application/hooks/use-categories';
import { useProducts, useRemoveProduct } from '../../application/hooks/use-products';
import type { Product, ProductTypeFilter } from '../../domain/types';
import { AdjustStockDialog } from '@/features/inventory/ui/components/AdjustStockDialog';
import { BulkUpdateDialog } from './BulkUpdateDialog';
import { ProductFormDialog } from './ProductFormDialog';

const FILTER_KEYS = ['q', 'categoryId', 'isActive', 'lowStock', 'type'] as const;

export function ProductsTable() {
  const table = useTableQueryState({
    defaultSort: 'name',
    defaultSortDir: 'asc',
    filterKeys: FILTER_KEYS,
  });

  const products = useProducts({
    q: table.filters.q || undefined,
    categoryId: table.filters.categoryId || undefined,
    isActive: parseBool(table.filters.isActive),
    lowStock: parseBool(table.filters.lowStock),
    type: (table.filters.type as ProductTypeFilter) || undefined,
    sort: table.sort,
    sortDir: table.sortDir,
    limit: table.pageSize,
    offset: (table.page - 1) * table.pageSize,
  });
  const remove = useRemoveProduct();
  const canUpdate = useHasPermission('products.update');

  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [delError, setDelError] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [formState, setFormState] = useState<
    { mode: 'create' } | { mode: 'edit'; id: string } | null
  >(null);

  const columns = useMemo<DataTableColumn<Product>[]>(
    () => [
      {
        key: 'imageUrl',
        header: '',
        render: (p) =>
          p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.imageUrl}
              alt=""
              loading="lazy"
              onError={(e) => {
                const img = e.currentTarget;
                img.style.display = 'none';
                const sibling = img.nextElementSibling as HTMLElement | null;
                if (sibling) sibling.style.display = 'flex';
              }}
              className="h-9 w-9 rounded-md border border-border/60 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-border/60 bg-muted/30 text-muted-foreground">
              <Package className="h-4 w-4 opacity-60" />
            </div>
          ),
      },
      {
        key: 'name',
        header: 'Nombre',
        sortable: true,
        render: (p) => (
          <>
            <Link
              href={`/products/${p.id}`}
              className="font-medium hover:underline"
            >
              {p.name}
            </Link>
            {p.isKit && (
              <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                Kit
              </span>
            )}
            {p.hasVariants && (
              <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                Variantes
              </span>
            )}
          </>
        ),
      },
      {
        key: 'sku',
        header: 'SKU',
        sortable: true,
        render: (p) => <span className="text-muted-foreground">{p.sku}</span>,
      },
      {
        key: 'category',
        header: 'Categoría',
        render: (p) => (
          <span className="text-muted-foreground">{p.category?.name ?? '—'}</span>
        ),
      },
      {
        key: 'salePrice',
        header: 'Precio',
        sortable: true,
        align: 'right',
        render: (p) => formatMoney(p.salePrice),
      },
      {
        key: 'stock',
        header: 'Stock',
        sortable: true,
        align: 'right',
        render: (p) => {
          // Umbral de alerta = punto de reorden si está definido (>0), si no el mínimo.
          const threshold =
            Number(p.reorderPoint) > 0 ? Number(p.reorderPoint) : Number(p.minStock);
          const low = threshold > 0 && Number(p.stock) <= threshold;
          return (
            <span className={low ? 'text-destructive font-medium' : ''}>
              {formatQuantity(p.stock)}
              {low && <span className="ml-1 text-xs">⚠</span>}
            </span>
          );
        },
      },
      {
        key: 'isActive',
        header: 'Estado',
        render: (p) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              p.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {p.isActive ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (p) => (
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setAdjustingId(p.id)}
              title="Ajustar stock"
              aria-label="Ajustar stock"
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setFormState({ mode: 'edit', id: p.id })}
              title="Editar"
              aria-label="Editar"
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setDelError(null);
                setDeleting(p);
              }}
              title="Eliminar"
              aria-label="Eliminar"
              disabled={remove.isPending}
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [remove],
  );

  const categories = useCategories();
  const hasFilters = FILTER_KEYS.some((k) => !!table.filters[k]);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Buscar por nombre, SKU o barcode..."
        value={table.filterDraft.q ?? ''}
        onChange={(e) => table.setFilter('q', e.target.value)}
        className="w-72"
      />
      <Chip
        label="Stock bajo"
        active={table.filterDraft.lowStock === 'true'}
        onClick={() =>
          table.setFilter(
            'lowStock',
            table.filterDraft.lowStock === 'true' ? undefined : 'true',
          )
        }
      />
      <StatusFilter
        value={table.filterDraft.isActive}
        onChange={(v) => table.setFilter('isActive', v)}
      />
      <Select
        value={table.filterDraft.categoryId ?? ''}
        onChange={(e) => table.setFilter('categoryId', e.target.value)}
        className="w-44"
      >
        <option value="">Todas las categorías</option>
        {categories.data?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Select
        value={table.filterDraft.type ?? ''}
        onChange={(e) => table.setFilter('type', e.target.value)}
        className="w-36"
      >
        <option value="">Todos los tipos</option>
        <option value="simple">Simples</option>
        <option value="kit">Kits</option>
        <option value="variant">Con variantes</option>
      </Select>
      {hasFilters && (
        <button
          type="button"
          onClick={() => table.clearFilters()}
          className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3 w-3" /> Limpiar
        </button>
      )}
      {canUpdate && (
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          title="Actualización masiva de precios y niveles de stock"
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Layers className="h-3.5 w-3.5" /> Actualización masiva
        </button>
      )}
    </div>
  );

  return (
    <>
      <DataTable<Product>
        columns={columns}
        rows={products.data?.items ?? []}
        total={products.data?.total ?? 0}
        rowKey={(p) => p.id}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        sortKey={table.sort}
        sortDir={table.sortDir}
        onSortChange={table.setSort}
        isLoading={products.isLoading}
        isFetching={products.isFetching}
        errorMessage={products.isError ? getErrorMessage(products.error) : null}
        emptyState={hasFilters ? 'Sin resultados con esos filtros.' : 'No hay productos.'}
        toolbar={toolbar}
      />

      {adjustingId && (
        <AdjustStockDialog
          productId={adjustingId}
          onClose={() => setAdjustingId(null)}
        />
      )}

      {formState && (
        <ProductFormDialog
          productId={formState.mode === 'edit' ? formState.id : null}
          onClose={() => setFormState(null)}
        />
      )}

      {bulkOpen && <BulkUpdateDialog onClose={() => setBulkOpen(false)} />}

      {deleting && (
        <ConfirmDialog
          title="Eliminar producto"
          message={
            <>
              ¿Eliminar <strong>{deleting.name}</strong>? Esta acción no se puede
              deshacer.
            </>
          }
          confirmLabel="Eliminar"
          destructive
          pending={remove.isPending}
          error={delError}
          onConfirm={async () => {
            setDelError(null);
            try {
              await remove.mutateAsync(deleting.id);
              setDeleting(null);
            } catch (e) {
              setDelError(getErrorMessage(e));
            }
          }}
          onClose={() => setDeleting(null)}
        />
      )}

      <Fab label="Nuevo producto" onClick={() => setFormState({ mode: 'create' })} />
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

function parseBool(v: string | undefined): boolean | undefined {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}
