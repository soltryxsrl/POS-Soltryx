'use client';

import { History } from 'lucide-react';
import { useProducts } from '@/features/products/application/hooks/use-products';
import type { Product } from '@/features/products/domain/types';
import { formatMoney } from '@/shared/lib/format';
import { useRecentProductsStore } from '../../application/stores/recent-products.store';

interface Props {
  onPick: (product: Product) => void;
}

/**
 * Fila horizontal con los últimos productos vendidos en esta máquina.
 * Cada chip muestra nombre + precio. Al hacer click resuelve el Product
 * actual desde el cache de useProducts (si está) o usa el snapshot guardado.
 */
export function RecentProducts({ onPick }: Props) {
  const recent = useRecentProductsStore((s) => s.items);
  // Cargamos productos activos para tener data fresca disponible en cache.
  // No filtramos por IDs porque el endpoint no expone "by ids"; basta con
  // que el cache de React Query tenga la lista para resolver al hacer click.
  const products = useProducts({ isActive: true, limit: 100 });

  if (recent.length === 0) return null;

  const lookupFresh = (id: string): Product | undefined =>
    products.data?.items.find((p) => p.id === id);

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <History className="h-3 w-3" />
        Recientes
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {recent.map((r) => {
          const fresh = lookupFresh(r.id);
          // Si el producto fue desactivado o eliminado, no lo ofrecemos.
          if (products.data && !fresh) return null;
          const handle = () => {
            if (fresh) {
              onPick(fresh);
              return;
            }
            // Cache todavía no resolvió: usa snapshot como fallback razonable.
            onPick({
              id: r.id,
              branchId: null,
              name: r.name,
              sku: r.sku,
              barcode: null,
              description: null,
              imageUrl: null,
              categoryId: null,
              category: null,
              costPrice: '0.00',
              salePrice: r.salePrice,
              taxRate: r.taxRate,
              taxTypeCode: null,
              stock: '0',
              minStock: '0',
              isActive: true,
              isKit: r.isKit,
              hasVariants: r.hasVariants,
              soldByWeight: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          };
          const thumb = fresh?.imageUrl ?? r.imageUrl ?? null;
          return (
            <button
              key={r.id}
              type="button"
              onClick={handle}
              title={`${r.name} · ${formatMoney(r.salePrice)}`}
              className="group inline-flex min-w-[160px] flex-shrink-0 items-center gap-2 rounded-lg border border-border/60 bg-background px-2 py-1.5 text-left transition hover:border-brand-from/40 hover:bg-brand-tint/40"
            >
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumb}
                  alt=""
                  loading="lazy"
                  className="h-9 w-9 flex-shrink-0 rounded-md object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand-from">
                  <span className="text-[10px] font-semibold uppercase">
                    {r.name.slice(0, 2)}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="line-clamp-1 text-xs font-medium text-foreground group-hover:text-brand-from">
                  {r.name}
                </span>
                <span className="mt-0.5 block text-[11px] font-semibold tabular-nums text-muted-foreground group-hover:text-brand-from">
                  {formatMoney(r.salePrice)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
