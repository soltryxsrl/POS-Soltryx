import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/features/products/domain/types';

/**
 * Snapshot de un producto agregado recientemente al carrito.
 * Guardamos los campos mínimos para mostrar en la fila "Recientes" del POS;
 * al hacer click, el ProductSearch ya tiene cache de la query y al re-renderizar
 * el tile con datos frescos resuelve cualquier divergencia de precio/stock.
 */
export interface RecentProductSnapshot {
  id: string;
  name: string;
  sku: string;
  salePrice: string;
  taxRate: string;
  hasVariants: boolean;
  isKit: boolean;
  /** URL pública del thumbnail al momento del último uso. */
  imageUrl: string | null;
  /** Para la heurística "más recientes primero". */
  lastUsedAt: number;
}

interface RecentProductsState {
  items: RecentProductSnapshot[];
  pushRecent: (p: Product) => void;
  clear: () => void;
}

const MAX_RECENT = 8;

export const useRecentProductsStore = create<RecentProductsState>()(
  persist(
    (set) => ({
      items: [],
      pushRecent: (p) =>
        set((state) => {
          const without = state.items.filter((it) => it.id !== p.id);
          const next: RecentProductSnapshot = {
            id: p.id,
            name: p.name,
            sku: p.sku,
            salePrice: p.salePrice,
            taxRate: p.taxRate,
            hasVariants: p.hasVariants,
            isKit: p.isKit,
            imageUrl: p.imageUrl,
            lastUsedAt: Date.now(),
          };
          return { items: [next, ...without].slice(0, MAX_RECENT) };
        }),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'pos:recent-products',
      storage: createJSONStorage(() => localStorage),
      // v2 añade imageUrl. Snapshots v1 (sin imageUrl) seguirán siendo válidos
      // con imageUrl=undefined; la UI lo trata como null.
      version: 2,
    },
  ),
);
