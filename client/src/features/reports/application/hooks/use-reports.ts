'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsApiHttp } from '../../infrastructure/api/reports.api.http';

export const reportsKey = {
  daily: (date: string) => ['reports', 'daily', date] as const,
  top: (params: { from?: string; to?: string; limit?: number }) =>
    ['reports', 'top', params] as const,
  lowStock: ['reports', 'low-stock'] as const,
  byMethod: (params: { from?: string; to?: string }) =>
    ['reports', 'by-method', params] as const,
  byUser: (params: { from?: string; to?: string }) =>
    ['reports', 'by-user', params] as const,
};

export function useDailySales(date: string) {
  return useQuery({
    queryKey: reportsKey.daily(date),
    queryFn: () => reportsApiHttp.daily(date),
  });
}

export function useTopProducts(params: { from?: string; to?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: reportsKey.top(params),
    queryFn: () => reportsApiHttp.topProducts(params),
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: reportsKey.lowStock,
    queryFn: () => reportsApiHttp.lowStock(),
  });
}

export function useSalesByMethod(params: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: reportsKey.byMethod(params),
    queryFn: () => reportsApiHttp.byMethod(params),
  });
}

export function useSessionsByUser(params: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: reportsKey.byUser(params),
    queryFn: () => reportsApiHttp.sessionsByUser(params),
  });
}
