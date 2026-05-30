'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cashApiHttp } from '../../infrastructure/api/cash.api.http';
import type {
  CloseCashSessionInput,
  ListSessionsParams,
  OpenCashSessionInput,
} from '../../domain/types';

export const cashKey = {
  all: ['cash'] as const,
  registers: ['cash', 'registers'] as const,
  activeMine: ['cash', 'active', 'mine'] as const,
  summary: (id: string) => ['cash', 'summary', id] as const,
  list: (params: ListSessionsParams) => ['cash', 'list', params] as const,
};

export function useCashRegisters() {
  return useQuery({
    queryKey: cashKey.registers,
    queryFn: () => cashApiHttp.listRegisters(),
  });
}

export function useActiveSessionMine() {
  return useQuery({
    queryKey: cashKey.activeMine,
    queryFn: () => cashApiHttp.getActiveMine(),
  });
}

export function useSessionSummary(id: string | undefined) {
  return useQuery({
    queryKey: cashKey.summary(id ?? '__none__'),
    queryFn: () => cashApiHttp.summary(id!),
    enabled: !!id,
    refetchInterval: 15_000,
  });
}

export function useCashSessions(params: ListSessionsParams = {}) {
  return useQuery({
    queryKey: cashKey.list(params),
    queryFn: () => cashApiHttp.list(params),
  });
}

export function useOpenCashSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OpenCashSessionInput) => cashApiHttp.open(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: cashKey.all }),
  });
}

export function useCloseCashSession(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CloseCashSessionInput) => cashApiHttp.close(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: cashKey.all }),
  });
}
