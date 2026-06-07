import { http } from '@/shared/lib/http-client';
import type { PlanUsage } from '../../domain/types';

export const planApiHttp = {
  /** Plan (topes) + uso actual. Solo lectura. */
  get: () => http<PlanUsage>('/plan'),
};
