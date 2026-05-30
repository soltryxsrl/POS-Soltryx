'use client';

import { formatMoney, formatQuantity } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useVariants } from '@/features/products/application/hooks/use-products';
import type { Product, ProductVariant } from '@/features/products/domain/types';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';

interface Props {
  product: Product;
  onPick: (variant: ProductVariant) => void;
  onClose: () => void;
}

export function VariantPicker({ product, onPick, onClose }: Props) {
  const variants = useVariants(product.id);
  const activeVariants = (variants.data ?? []).filter((v) => v.isActive);

  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title={`Variantes · ${product.name}`}
      size="md"
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Este producto se vende por variantes. Selecciona la que el cliente quiere.
      </p>

      {variants.isLoading && (
        <p className="text-sm text-muted-foreground">Cargando variantes...</p>
      )}
      {variants.isError && (
        <p className="text-sm text-destructive">{getErrorMessage(variants.error)}</p>
      )}
      {activeVariants.length === 0 && variants.data && (
        <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          Este producto no tiene variantes activas. Agrega variantes desde la
          ficha del producto.
        </p>
      )}

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {activeVariants.map((v) => {
          const price = v.salePrice ?? product.salePrice;
          const lowStock = Number(v.stock) <= Number(v.minStock) && Number(v.minStock) > 0;
          const noStock = Number(v.stock) <= 0;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                onPick(v);
                onClose();
              }}
              className="flex flex-col items-start gap-1 rounded-xl border-2 border-border bg-background px-3 py-3 text-left transition hover:border-brand-from hover:bg-brand-tint"
            >
              <span className="line-clamp-1 text-sm font-medium">{v.name}</span>
              <span className="text-xs text-muted-foreground">
                <code>{v.sku}</code>
              </span>
              <span className="text-sm font-semibold text-brand-from">
                {formatMoney(price)}
              </span>
              <span
                className={
                  noStock
                    ? 'text-[11px] font-medium text-destructive'
                    : lowStock
                    ? 'text-[11px] font-medium text-amber-600'
                    : 'text-[11px] text-muted-foreground'
                }
              >
                Stock: {formatQuantity(v.stock)}
                {noStock && ' · Sin stock'}
                {!noStock && lowStock && ' · Bajo'}
              </span>
            </button>
          );
        })}
      </ul>
    </MaintenanceShell>
  );
}
