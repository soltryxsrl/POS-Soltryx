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
