import type { MoneyDto } from '@/shared/types/enums';

export type PromotionType =
  | 'PRODUCT_PERCENT_OFF'
  | 'PRODUCT_AMOUNT_OFF'
  | 'PRODUCT_BUY_X_GET_Y'
  | 'ORDER_PERCENT_OFF'
  | 'ORDER_AMOUNT_OFF';

export interface Promotion {
  id: string;
  branchId: string | null;
  name: string;
  description: string | null;
  type: PromotionType;
  productId: string | null;
  /** Si la promo aplica SOLO a una variante específica. Requiere productId también. */
  variantId: string | null;
  categoryId: string | null;
  percentOff: string | null;
  amountOff: MoneyDto | null;
  minQuantity: number | null;
  freeQuantity: number | null;
  minOrderTotal: MoneyDto | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromotionInput {
  name: string;
  description?: string;
  type: PromotionType;
  productId?: string;
  variantId?: string;
  categoryId?: string;
  percentOff?: string;
  amountOff?: MoneyDto;
  minQuantity?: number;
  freeQuantity?: number;
  minOrderTotal?: MoneyDto;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
  priority?: number;
}

export type UpdatePromotionInput = Partial<CreatePromotionInput>;

export type PromotionStatusFilter = 'active' | 'scheduled' | 'expired' | 'inactive';

export interface ListPromotionsParams {
  q?: string;
  isActive?: boolean;
  status?: PromotionStatusFilter;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PromotionsList {
  items: Promotion[];
  total: number;
}
