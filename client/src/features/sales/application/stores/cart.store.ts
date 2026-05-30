import { create } from 'zustand';
import type { MoneyDto } from '@/shared/types/enums';

export interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  unitPrice: MoneyDto;
  taxRate: string;
  quantity: number;
  discount: MoneyDto;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity' | 'discount'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setDiscount: (productId: string, discount: MoneyDto) => void;
  clear: () => void;
}

/**
 * Estado del carrito de la pantalla POS (cliente).
 * Lógica de totales y validaciones de stock viven en use cases puros,
 * no aquí — este store solo guarda estado UI.
 */
export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (item) =>
    set((s) => {
      const existing = s.items.find((i) => i.productId === item.productId);
      if (existing) {
        return {
          items: s.items.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
              : i,
          ),
        };
      }
      return {
        items: [...s.items, { ...item, quantity: item.quantity ?? 1, discount: '0.00' }],
      };
    }),
  removeItem: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
  setQuantity: (productId, quantity) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.max(0, quantity) } : i,
      ),
    })),
  setDiscount: (productId, discount) =>
    set((s) => ({
      items: s.items.map((i) => (i.productId === productId ? { ...i, discount } : i)),
    })),
  clear: () => set({ items: [] }),
}));
