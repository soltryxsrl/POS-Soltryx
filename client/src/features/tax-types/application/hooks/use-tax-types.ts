'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taxTypesApiHttp } from '../../infrastructure/api/tax-types.api.http';

export const taxTypesKey = {
  all: ['tax-types'] as const,
  list: (params: { activeOnly?: boolean } = {}) =>
    ['tax-types', params] as const,
};

export function useTaxTypes(params: { activeOnly?: boolean } = {}) {
  return useQuery({
    queryKey: taxTypesKey.list(params),
    queryFn: () => taxTypesApiHttp.list(params),
  });
}

export function useToggleTaxType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, isActive }: { code: string; isActive: boolean }) =>
      taxTypesApiHttp.toggle(code, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: taxTypesKey.all }),
  });
}

export function useSetDefaultTaxType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => taxTypesApiHttp.setDefault(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: taxTypesKey.all }),
  });
}
