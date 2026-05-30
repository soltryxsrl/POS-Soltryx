import { http } from '@/shared/lib/http-client';
import type {
  Currency,
  SetRateInput,
  ToggleCurrencyInput,
} from '../../domain/types';

export const currenciesApiHttp = {
  list: (activeOnly?: boolean) =>
    http<Currency[]>('/currencies', {
      searchParams: { activeOnly: activeOnly ? 'true' : undefined },
    }),
  toggle: (code: string, input: ToggleCurrencyInput) =>
    http<Currency>(`/currencies/${code}`, { method: 'PATCH', body: input }),
  setRate: (code: string, input: SetRateInput) =>
    http<Currency>(`/currencies/${code}/rate`, { method: 'PUT', body: input }),
};
