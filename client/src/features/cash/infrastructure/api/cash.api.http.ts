import { http } from '@/shared/lib/http-client';
import type {
  CashMovement,
  CashRegister,
  CashSession,
  CashSessionSummary,
  CashSessionsList,
  CloseCashSessionInput,
  ListSessionsParams,
  OpenCashSessionInput,
  RecordCashMovementInput,
  SessionReport,
} from '../../domain/types';

export const cashApiHttp = {
  listRegisters: () => http<CashRegister[]>('/cash-registers', { searchParams: { isActive: true } }),

  getActiveMine: () =>
    http<CashSession | null>('/cash-sessions/active', { searchParams: { mine: 'true' } }),

  getActiveForRegister: (cashRegisterId: string) =>
    http<CashSession | null>('/cash-sessions/active', { searchParams: { cashRegisterId } }),

  open: (input: OpenCashSessionInput) =>
    http<CashSession>('/cash-sessions/open', { method: 'POST', body: input }),

  close: (id: string, input: CloseCashSessionInput) =>
    http<CashSession>(`/cash-sessions/${id}/close`, { method: 'POST', body: input }),

  summary: (id: string) => http<CashSessionSummary>(`/cash-sessions/${id}/summary`),

  list: (params?: ListSessionsParams) =>
    http<CashSessionsList>('/cash-sessions', {
      searchParams: params as Record<string, string | number | boolean | undefined> | undefined,
    }),

  listMovements: (id: string) => http<CashMovement[]>(`/cash-sessions/${id}/movements`),

  recordMovement: (id: string, input: RecordCashMovementInput) =>
    http<CashMovement>(`/cash-sessions/${id}/movements`, { method: 'POST', body: input }),

  report: (id: string) => http<SessionReport>(`/cash-sessions/${id}/report`),
};
