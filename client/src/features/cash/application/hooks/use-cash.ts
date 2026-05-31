'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cashApiHttp } from '../../infrastructure/api/cash.api.http';
import type {
  CloseCashSessionInput,
  ListSessionsParams,
  OpenCashSessionInput,
  RecordCashMovementInput,
} from '../../domain/types';

export const cashKey = {
  all: ['cash'] as const,
  registers: ['cash', 'registers'] as const,
  activeMine: ['cash', 'active', 'mine'] as const,
  summary: (id: string) => ['cash', 'summary', id] as const,
  list: (params: ListSessionsParams) => ['cash', 'list', params] as const,
  movements: (id: string) => ['cash', 'movements', id] as const,
  report: (id: string) => ['cash', 'report', id] as const,
};

export function useCashRegisters() {
  return useQuery({
    queryKey: cashKey.registers,
    queryFn: () => cashApiHttp.listRegisters(),
  });
}

export function useCreateCashRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; code?: string }) =>
      cashApiHttp.createRegister(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: cashKey.registers }),
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

export function useCashMovements(id: string | undefined) {
  return useQuery({
    queryKey: cashKey.movements(id ?? '__none__'),
    queryFn: () => cashApiHttp.listMovements(id!),
    enabled: !!id,
  });
}

export function useRecordCashMovement(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordCashMovementInput) => cashApiHttp.recordMovement(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: cashKey.all }),
  });
}

export function useSessionReport(id: string | undefined) {
  return useQuery({
    queryKey: cashKey.report(id ?? '__none__'),
    queryFn: () => cashApiHttp.report(id!),
    enabled: !!id,
  });
}
