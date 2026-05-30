import type { MoneyDto, PaymentMethod } from '@/shared/types/enums';

export type CustomerDocType = 'CEDULA' | 'RNC' | 'PASSPORT' | 'OTHER';

export interface Customer {
  id: string;
  branchId: string | null;
  documentType: CustomerDocType | null;
  document: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomersList {
  items: Customer[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateCustomerInput {
  fullName: string;
  documentType?: CustomerDocType;
  document?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export interface ListCustomersParams {
  q?: string;
  isActive?: 'true' | 'false';
  limit?: number;
  offset?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
}

export type AccountEntryType = 'CHARGE' | 'PAYMENT' | 'REVERSAL';

export interface AccountEntry {
  id: string;
  customerId: string;
  type: AccountEntryType;
  amount: MoneyDto;
  saleId: string | null;
  cashSessionId: string | null;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  userId: string;
  createdAt: string;
}

export interface AccountSummary {
  customerId: string;
  customerName: string;
  balance: MoneyDto;
  chargeTotal: MoneyDto;
  paymentTotal: MoneyDto;
  reversalTotal: MoneyDto;
  entries: AccountEntry[];
}

export interface RegisterPaymentInput {
  amount: MoneyDto;
  paymentMethod: Exclude<PaymentMethod, 'ACCOUNT'>;
  cashSessionId?: string;
  reference?: string;
  notes?: string;
}
