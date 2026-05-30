import type { MoneyDto } from '@/shared/types/enums';

export type RefundMethod =
  | 'CASH'
  | 'CARD'
  | 'TRANSFER'
  | 'STORE_CREDIT'
  | 'ACCOUNT'
  | 'OTHER';

export interface ReturnableItem {
  saleItemId: string;
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: MoneyDto;
  taxRate: string;
  orderedQuantity: string;
  alreadyReturned: string;
  remaining: string;
}

export interface SaleReturnItem {
  id: string;
  saleItemId: string;
  productId: string;
  productNameSnapshot: string;
  productSkuSnapshot: string;
  quantity: string;
  unitPrice: MoneyDto;
  taxRate: string;
  taxTotal: MoneyDto;
  total: MoneyDto;
}

export interface SaleReturn {
  id: string;
  returnNumber: string;
  saleId: string;
  saleNumber: string | null;
  cashSessionId: string;
  customerId: string | null;
  userId: string;
  refundMethod: RefundMethod;
  subtotal: MoneyDto;
  taxTotal: MoneyDto;
  total: MoneyDto;
  reason: string | null;
  notes: string | null;
  items: SaleReturnItem[];
  createdAt: string;
}

export interface CreateReturnInput {
  saleId: string;
  refundMethod: RefundMethod;
  reason?: string;
  notes?: string;
  items: Array<{ saleItemId: string; quantity: string }>;
}

export interface ListReturnsParams {
  q?: string;
  saleId?: string;
  userId?: string;
  refundMethod?: RefundMethod;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
}

export interface ReturnsList {
  items: SaleReturn[];
  total: number;
}
