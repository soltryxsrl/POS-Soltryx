import type { MoneyDto } from '@/shared/types/enums';

export interface DailySalesSummary {
  date: string;
  salesCount: number;
  cancelledCount: number;
  subtotal: MoneyDto;
  discountTotal: MoneyDto;
  taxTotal: MoneyDto;
  total: MoneyDto;
  byMethod: Array<{ method: string; count: number; total: MoneyDto }>;
  byUser: Array<{
    userId: string;
    username: string;
    fullName: string;
    salesCount: number;
    total: MoneyDto;
  }>;
}

export interface TopProduct {
  productId: string;
  name: string;
  sku: string;
  unitsSold: string;
  revenue: MoneyDto;
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stock: string;
  minStock: string;
  categoryName: string | null;
}

export interface SalesByMethod {
  method: string;
  count: number;
  total: MoneyDto;
}

export interface SessionsByUser {
  userId: string;
  username: string;
  fullName: string;
  sessionsCount: number;
  salesCount: number;
  totalSold: MoneyDto;
}
