import { http } from '@/shared/lib/http-client';
import type {
  DailySalesSummary,
  LowStockProduct,
  SalesByMethod,
  SessionsByUser,
  TopProduct,
} from '../../domain/types';

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
};
