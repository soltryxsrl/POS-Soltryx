import { http } from '@/shared/lib/http-client';
import type { TaxType } from '../../domain/types';

export const taxTypesApiHttp = {
  list: (params: { activeOnly?: boolean } = {}) =>
    http<TaxType[]>('/tax-types', {
      searchParams: { ...(params.activeOnly ? { activeOnly: 'true' } : {}) },
    }),

  toggle: (code: string, isActive: boolean) =>
    http<TaxType>(`/tax-types/${code}`, { method: 'PATCH', body: { isActive } }),

  setDefault: (code: string) =>
    http<TaxType>(`/tax-types/${code}/default`, { method: 'PUT' }),
};
