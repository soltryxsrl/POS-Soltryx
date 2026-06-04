import { http } from '@/shared/lib/http-client';
import type {
  CategorySales,
  DailySalesSummary,
  InventoryValuation,
  LowStockProduct,
  ProductMargin,
  ReturnsAnalysis,
  SalesByMethod,
  SalesDetailReport,
  SessionsByUser,
  SlowMover,
  TopProduct,
} from '../../domain/types';

type RangeParams = { from?: string; to?: string; branchId?: string };

export const reportsApiHttp = {
  daily: (date?: string, branchId?: string) =>
    http<DailySalesSummary>('/reports/sales/daily', {
      searchParams: { date, branchId },
    }),

  topProducts: (params: { from?: string; to?: string; limit?: number; branchId?: string } = {}) =>
    http<TopProduct[]>('/reports/products/top', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),

  lowStock: (branchId?: string) =>
    http<LowStockProduct[]>('/reports/products/low-stock', {
      searchParams: { branchId },
    }),

  byMethod: (params: { from?: string; to?: string; branchId?: string } = {}) =>
    http<SalesByMethod[]>('/reports/sales/by-method', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),

  sessionsByUser: (params: { from?: string; to?: string; branchId?: string } = {}) =>
    http<SessionsByUser[]>('/reports/sessions/by-user', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),

  inventoryValuation: (branchId?: string) =>
    http<InventoryValuation>('/reports/inventory/valuation', {
      searchParams: { branchId },
    }),

  productMargins: (params: RangeParams & { limit?: number } = {}) =>
    http<ProductMargin[]>('/reports/products/margins', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),

  slowMovers: (params: { days?: number; limit?: number; branchId?: string } = {}) =>
    http<SlowMover[]>('/reports/products/slow-movers', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),

  salesByCategory: (params: RangeParams = {}) =>
    http<CategorySales[]>('/reports/sales/by-category', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),

  returnsAnalysis: (params: RangeParams = {}) =>
    http<ReturnsAnalysis>('/reports/returns/analysis', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),

  salesDetail: (
    params: RangeParams & {
      productId?: string;
      categoryId?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) =>
    http<SalesDetailReport>('/reports/sales/detail', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),
};
