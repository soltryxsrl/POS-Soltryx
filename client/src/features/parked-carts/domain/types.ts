import type { MoneyDto } from '@/shared/types/enums';

export interface ParkedCartItem {
  /** Null en ítems de "monto libre" (sin producto del catálogo). */
  productId: string | null;
  /** Si la línea era una variante específica. Backward-compatible: null/undefined si no. */
  variantId?: string | null;
  variantName?: string | null;
  productName: string;
  sku: string;
  unitPrice: MoneyDto;
  taxRate: string;
  quantity: number;
  discount: MoneyDto;
  /** Nota libre de la línea (modificador). Backward-compat: opcional. */
  notes?: string | null;
}

export interface ParkedCartPayload {
  items: ParkedCartItem[];
  orderDiscount: MoneyDto;
}

export interface ParkedCart {
  id: string;
  userId: string;
  cashSessionId: string;
  customerId: string | null;
  label: string | null;
  notes: string | null;
  payload: ParkedCartPayload;
  createdAt: string;
  updatedAt: string;
}

export interface CreateParkedCartInput {
  cashSessionId: string;
  customerId?: string;
  label?: string;
  notes?: string;
  payload: ParkedCartPayload;
}
