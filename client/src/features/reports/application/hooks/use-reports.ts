'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsApiHttp } from '../../infrastructure/api/reports.api.http';

export const reportsKey = {
  daily: (date: string, branchId?: string) => ['reports', 'daily', date, branchId ?? null] as const,
  top: (params: { from?: string; to?: string; limit?: number; branchId?: string }) =>
    ['reports', 'top', params] as const,
  lowStock: (branchId?: string) => ['reports', 'low-stock', branchId ?? null] as const,
  byMethod: (params: { from?: string; to?: string; branchId?: string }) =>
    ['reports', 'by-method', params] as const,
  byUser: (params: { from?: string; to?: string; branchId?: string }) =>
    ['reports', 'by-user', params] as const,
  valuation: (branchId?: string) => ['reports', 'valuation', branchId ?? null] as const,
  margins: (params: { from?: string; to?: string; limit?: number; branchId?: string }) =>
    ['reports', 'margins', params] as const,
  slowMovers: (params: { days?: number; limit?: number; branchId?: string }) =>
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
};

export function useDailySales(date: string, branchId?: string) {
  return useQuery({
    queryKey: reportsKey.daily(date, branchId),
    queryFn: () => reportsApiHttp.daily(date, branchId),
  });
}

export function useTopProducts(
  params: { from?: string; to?: string; limit?: number; branchId?: string } = {},
) {
  return useQuery({
    queryKey: reportsKey.top(params),
    queryFn: () => reportsApiHttp.topProducts(params),
  });
}

export function useLowStock(branchId?: string) {
  return useQuery({
    queryKey: reportsKey.lowStock(branchId),
    queryFn: () => reportsApiHttp.lowStock(branchId),
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

export function useInventoryValuation(branchId?: string) {
  return useQuery({
    queryKey: reportsKey.valuation(branchId),
    queryFn: () => reportsApiHttp.inventoryValuation(branchId),
  });
}

export function useProductMargins(
  params: { from?: string; to?: string; limit?: number; branchId?: string } = {},
) {
  return useQuery({
    queryKey: reportsKey.margins(params),
    queryFn: () => reportsApiHttp.productMargins(params),
  });
}

export function useSlowMovers(
  params: { days?: number; limit?: number; branchId?: string } = {},
) {
  return useQuery({
    queryKey: reportsKey.slowMovers(params),
    queryFn: () => reportsApiHttp.slowMovers(params),
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
