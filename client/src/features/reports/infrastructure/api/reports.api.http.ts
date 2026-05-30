import { http } from '@/shared/lib/http-client';
import type {
  DailySalesSummary,
  LowStockProduct,
  SalesByMethod,
  SessionsByUser,
  TopProduct,
} from '../../domain/types';

export const reportsApiHttp = {
  daily: (date?: string) =>
    http<DailySalesSummary>('/reports/sales/daily', {
      searchParams: date ? { date } : undefined,
    }),

  topProducts: (params: { from?: string; to?: string; limit?: number } = {}) =>
    http<TopProduct[]>('/reports/products/top', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),

  lowStock: () => http<LowStockProduct[]>('/reports/products/low-stock'),

  byMethod: (params: { from?: string; to?: string } = {}) =>
    http<SalesByMethod[]>('/reports/sales/by-method', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),

  sessionsByUser: (params: { from?: string; to?: string } = {}) =>
    http<SessionsByUser[]>('/reports/sessions/by-user', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),
};
