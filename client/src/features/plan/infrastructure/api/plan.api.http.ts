import { http } from '@/shared/lib/http-client';
import type { PlanUsage } from '../../domain/types';

export const planApiHttp = {
  /** Plan (topes) + uso actual. Solo lectura. */
  get: () => http<PlanUsage>('/plan'),

  /** Upsell: cambia los topes. Requiere el secreto super-admin (header). */
  update: (
    secret: string,
    body: { maxUsers: number | null; maxBranches: number | null },
  ) =>
    http<PlanUsage>('/plan', {
      method: 'PATCH',
      headers: { 'x-superadmin-secret': secret },
      body,
    }),
};
