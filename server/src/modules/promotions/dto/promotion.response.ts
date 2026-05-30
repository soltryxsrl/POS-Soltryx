import type { PromotionOrmEntity, PromotionType } from '../promotion.orm-entity';

export interface PromotionResponse {
  id: string;
  branchId: string | null;
  name: string;
  description: string | null;
  type: PromotionType;
  productId: string | null;
  variantId: string | null;
  categoryId: string | null;
  percentOff: string | null;
  amountOff: string | null;
  minQuantity: number | null;
  freeQuantity: number | null;
  minOrderTotal: string | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export function toPromotionResponse(p: PromotionOrmEntity): PromotionResponse {
  return {
    id: p.id,
    branchId: p.branchId,
    name: p.name,
    description: p.description,
    type: p.type as PromotionType,
    productId: p.productId,
    variantId: p.variantId,
    categoryId: p.categoryId,
    percentOff: p.percentOff,
    amountOff: p.amountOff,
    minQuantity: p.minQuantity,
    freeQuantity: p.freeQuantity,
    minOrderTotal: p.minOrderTotal,
    validFrom: p.validFrom ? p.validFrom.toISOString() : null,
    validUntil: p.validUntil ? p.validUntil.toISOString() : null,
    isActive: p.isActive,
    priority: p.priority,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
