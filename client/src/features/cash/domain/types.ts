import type { CashSessionStatus, MoneyDto } from '@/shared/types/enums';

export interface CashRegister {
  id: string;
  branchId: string | null;
  code: string;
  name: string;
  isActive: boolean;
}

export interface CashSession {
  id: string;
  branchId: string | null;
  cashRegisterId: string;
  openedById: string;
  closedById: string | null;
  openedAt: string;
  closedAt: string | null;
  openingAmount: MoneyDto;
  expectedAmount: MoneyDto | null;
  countedAmount: MoneyDto | null;
  difference: MoneyDto | null;
  status: CashSessionStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CashSessionSummary {
  session: CashSession;
  openingAmount: MoneyDto;
  cashSales: MoneyDto;
  cashRefunds: MoneyDto;
  nonCashSales: MoneyDto;
  expectedAmount: MoneyDto;
  countedAmount: MoneyDto | null;
  difference: MoneyDto | null;
}

export interface OpenCashSessionInput {
  cashRegisterId: string;
  openingAmount: MoneyDto;
  notes?: string;
}

export interface CloseCashSessionInput {
  countedAmount: MoneyDto;
  notes?: string;
}

export interface CashSessionsList {
  items: CashSession[];
  total: number;
}

export interface ListSessionsParams {
  status?: CashSessionStatus;
  cashRegisterId?: string;
  openedById?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}
