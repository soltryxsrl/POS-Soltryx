'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsApiHttp } from '../../infrastructure/api/reports.api.http';

export const reportsKey = {
  daily: (date: string, branchId?: string) => ['reports', 'daily', date, branchId ?? null] as const,
  top: (params: { from?: string; to?: string; limit?: number; offset?: number; branchId?: string }) =>
    ['reports', 'top', params] as const,
  lowStock: (params: { limit?: number; offset?: number; branchId?: string }) =>
    ['reports', 'low-stock', params] as const,
  byMethod: (params: { from?: string; to?: string; branchId?: string }) =>
    ['reports', 'by-method', params] as const,
  byUser: (params: { from?: string; to?: string; branchId?: string }) =>
    ['reports', 'by-user', params] as const,
  bySeller: (params: { from?: string; to?: string; branchId?: string }) =>
    ['reports', 'by-seller', params] as const,
  valuation: (branchId?: string) => ['reports', 'valuation', branchId ?? null] as const,
  margins: (params: { from?: string; to?: string; limit?: number; offset?: number; branchId?: string }) =>
    ['reports', 'margins', params] as const,
  slowMovers: (params: { days?: number; limit?: number; offset?: number; branchId?: string }) =>
    ['reports', 'slow-movers', params] as const,
  byCategory: (params: { from?: string; to?: string; branchId?: string }) =>
    ['reports', 'by-category', params] as const,
  returns: (params: { from?: string; to?: string; branchId?: string }) =>
    ['reports', 'returns-analysis', params] as const,
  salesDetail: (params: {
    from?: string;
    to?: string;
    productId?: string;
    categoryId?: string;
    limit?: number;
    offset?: number;
    branchId?: string;
  }) => ['reports', 'sales-detail', params] as const,
  priceHistory: (params: {
    from?: string;
    to?: string;
    productId?: string;
    limit?: number;
    offset?: number;
    branchId?: string;
  }) => ['reports', 'price-history', params] as const,
  stockByBranch: (params: { q?: string; limit?: number; offset?: number }) =>
    ['reports', 'stock-by-branch', params] as const,
};

export function useDailySales(date: string, branchId?: string) {
  return useQuery({
    queryKey: reportsKey.daily(date, branchId),
    queryFn: () => reportsApiHttp.daily(date, branchId),
  });
}

export function useTopProducts(
  params: { from?: string; to?: string; limit?: number; offset?: number; branchId?: string } = {},
) {
  return useQuery({
    queryKey: reportsKey.top(params),
    queryFn: () => reportsApiHttp.topProducts(params),
    placeholderData: (prev) => prev,
  });
}

export function useLowStock(
  params: { limit?: number; offset?: number; branchId?: string } = {},
) {
  return useQuery({
    queryKey: reportsKey.lowStock(params),
    queryFn: () => reportsApiHttp.lowStock(params),
    placeholderData: (prev) => prev,
  });
}

export function useSalesByMethod(params: { from?: string; to?: string; branchId?: string } = {}) {
  return useQuery({
    queryKey: reportsKey.byMethod(params),
    queryFn: () => reportsApiHttp.byMethod(params),
  });
}

export function useSessionsByUser(params: { from?: string; to?: string; branchId?: string } = {}) {
  return useQuery({
    queryKey: reportsKey.byUser(params),
    queryFn: () => reportsApiHttp.sessionsByUser(params),
  });
}

export function useSalesBySeller(params: { from?: string; to?: string; branchId?: string } = {}) {
  return useQuery({
    queryKey: reportsKey.bySeller(params),
    queryFn: () => reportsApiHttp.salesBySeller(params),
  });
}

export function useInventoryValuation(branchId?: string) {
  return useQuery({
    queryKey: reportsKey.valuation(branchId),
    queryFn: () => reportsApiHttp.inventoryValuation(branchId),
  });
}

export function useProductMargins(
  params: { from?: string; to?: string; limit?: number; offset?: number; branchId?: string } = {},
) {
  return useQuery({
    queryKey: reportsKey.margins(params),
    queryFn: () => reportsApiHttp.productMargins(params),
    placeholderData: (prev) => prev,
  });
}

export function useSlowMovers(
  params: { days?: number; limit?: number; offset?: number; branchId?: string } = {},
) {
  return useQuery({
    queryKey: reportsKey.slowMovers(params),
    queryFn: () => reportsApiHttp.slowMovers(params),
    placeholderData: (prev) => prev,
  });
}

export function useSalesByCategory(params: { from?: string; to?: string; branchId?: string } = {}) {
  return useQuery({
    queryKey: reportsKey.byCategory(params),
    queryFn: () => reportsApiHttp.salesByCategory(params),
  });
}

export function useReturnsAnalysis(params: { from?: string; to?: string; branchId?: string } = {}) {
  return useQuery({
    queryKey: reportsKey.returns(params),
    queryFn: () => reportsApiHttp.returnsAnalysis(params),
  });
}

export function useSalesDetail(
  params: {
    from?: string;
    to?: string;
    productId?: string;
    categoryId?: string;
    limit?: number;
    offset?: number;
    branchId?: string;
  } = {},
) {
  return useQuery({
    queryKey: reportsKey.salesDetail(params),
    queryFn: () => reportsApiHttp.salesDetail(params),
    placeholderData: (prev) => prev,
  });
}

export function usePriceHistory(
  params: {
    from?: string;
    to?: string;
    productId?: string;
    limit?: number;
    offset?: number;
    branchId?: string;
  } = {},
) {
  return useQuery({
    queryKey: reportsKey.priceHistory(params),
    queryFn: () => reportsApiHttp.priceHistory(params),
    placeholderData: (prev) => prev,
  });
}

export function useStockByBranch(
  params: { q?: string; limit?: number; offset?: number } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: reportsKey.stockByBranch(params),
    queryFn: () => reportsApiHttp.stockByBranch(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}
