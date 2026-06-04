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
  /** Punto de reorden (0 = no definido → se usa el mínimo). */
  reorderPoint: string;
  /** Umbral de alerta efectivo: reorden si >0, si no el mínimo. */
  threshold: string;
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

export interface InventoryValuation {
  skusWithStock: number;
  totalUnits: string;
  totalCost: MoneyDto;
  totalRetail: MoneyDto;
  potentialMargin: MoneyDto;
  byCategory: Array<{
    categoryId: string | null;
    categoryName: string;
    skus: number;
    totalCost: MoneyDto;
    totalRetail: MoneyDto;
  }>;
}

export interface ProductMargin {
  productId: string;
  name: string;
  sku: string;
  unitsSold: string;
  revenue: MoneyDto;
  cost: MoneyDto;
  margin: MoneyDto;
  marginPct: string;
}

export interface SlowMover {
  id: string;
  name: string;
  sku: string;
  stock: string;
  costPrice: MoneyDto;
  tiedUpCost: MoneyDto;
  categoryName: string | null;
  lastSoldAt: string | null;
}

export interface CategorySales {
  categoryId: string | null;
  categoryName: string;
  unitsSold: string;
  revenue: MoneyDto;
}

export interface ReturnsAnalysis {
  count: number;
  total: MoneyDto;
  taxTotal: MoneyDto;
  byMethod: Array<{ refundMethod: string; count: number; total: MoneyDto }>;
  byReason: Array<{ reason: string; count: number; total: MoneyDto }>;
}

export interface SalesDetailLine {
  saleId: string;
  saleNumber: string;
  ncf: string | null;
  createdAt: string;
  cashier: string;
  productId: string | null;
  productName: string;
  productSku: string;
  variantName: string | null;
  quantity: string;
  unitPrice: MoneyDto;
  discount: MoneyDto;
  total: MoneyDto;
  unitCost: MoneyDto;
  margin: MoneyDto;
}

export interface SalesDetailReport {
  items: SalesDetailLine[];
  total: number;
  limit: number;
  offset: number;
  summary: {
    lines: number;
    units: string;
    revenue: MoneyDto;
    cost: MoneyDto;
    margin: MoneyDto;
  };
}

export interface PriceHistoryEntry {
  id: string;
  createdAt: string;
  productId: string;
  productName: string;
  productSku: string;
  variantName: string | null;
  /** 'sale_price' | 'cost_price'. */
  field: string;
  oldValue: MoneyDto;
  newValue: MoneyDto;
  /** 'manual' | 'bulk'. */
  source: string;
  userName: string | null;
}

export interface PriceHistoryReport {
  items: PriceHistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface StockByBranchRow {
  sku: string;
  name: string;
  categoryName: string | null;
  /** { [branchId]: stock } — sucursal ausente = 0. */
  perBranch: Record<string, string>;
  totalStock: string;
}

export interface StockByBranchReport {
  branches: Array<{ id: string; name: string }>;
  items: StockByBranchRow[];
  total: number;
  limit: number;
  offset: number;
}
