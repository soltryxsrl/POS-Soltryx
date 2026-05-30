import { http } from '@/shared/lib/http-client';
import type {
  PaymentMethodConfig,
  UpdatePaymentMethodInput,
} from '../../domain/types';

export const paymentMethodsApiHttp = {
  list: (params: { activeOnly?: boolean } = {}) =>
    http<PaymentMethodConfig[]>('/payment-methods', {
      searchParams: { ...(params.activeOnly ? { activeOnly: 'true' } : {}) },
    }),

  update: (code: string, input: UpdatePaymentMethodInput) =>
    http<PaymentMethodConfig>(`/payment-methods/${code}`, {
      method: 'PATCH',
      body: input,
    }),

  setDefault: (code: string) =>
    http<PaymentMethodConfig>(`/payment-methods/${code}/default`, {
      method: 'PUT',
    }),
};
