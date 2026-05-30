import type { MoneyDto, PaymentMethod, SaleStatus, FiscalStatus } from '@/shared/types/enums';

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productNameSnapshot: string;
  productSkuSnapshot: string;
  quantity: string;
  unitPrice: MoneyDto;
  discount: MoneyDto;
  taxRate: string;
  taxTotal: MoneyDto;
  total: MoneyDto;
  createdAt: string;
}

export interface SalePayment {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amount: MoneyDto;
  reference: string | null;
  status: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  branchId: string | null;
  saleNumber: string;
  customerId: string | null;
  userId: string;
  cashSessionId: string;
  subtotal: MoneyDto;
  discountTotal: MoneyDto;
  taxTotal: MoneyDto;
  total: MoneyDto;
  status: SaleStatus;
  fiscalStatus: FiscalStatus;
  fiscalDocumentId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  cancelledById: string | null;
  cancelReason: string | null;
  items: SaleItem[];
  payments: SalePayment[];
}

export interface SalesList {
  items: Sale[];
  total: number;
}

export interface CreateSaleInput {
  cashSessionId: string;
  customerId?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: string;
    discount?: MoneyDto;
  }>;
  payments: Array<{
    method: PaymentMethod;
    amount: MoneyDto;
    reference?: string;
  }>;
}

export interface ListSalesParams {
  status?: SaleStatus;
  cashSessionId?: string;
  userId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}
