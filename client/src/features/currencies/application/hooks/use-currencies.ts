'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { currenciesApiHttp } from '../../infrastructure/api/currencies.api.http';
import type { SetRateInput, ToggleCurrencyInput } from '../../domain/types';

export const currenciesKey = {
  all: ['currencies'] as const,
  list: (activeOnly?: boolean) => ['currencies', 'list', { activeOnly }] as const,
};

export function useCurrencies(activeOnly?: boolean) {
  return useQuery({
    queryKey: currenciesKey.list(activeOnly),
    queryFn: () => currenciesApiHttp.list(activeOnly),
  });
}

export function useToggleCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { code: string; input: ToggleCurrencyInput }) =>
      currenciesApiHttp.toggle(vars.code, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: currenciesKey.all }),
  });
}

export function useSetCurrencyRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { code: string; input: SetRateInput }) =>
      currenciesApiHttp.setRate(vars.code, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: currenciesKey.all }),
  });
}
