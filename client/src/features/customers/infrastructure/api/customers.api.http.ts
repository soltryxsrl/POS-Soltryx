import { http } from '@/shared/lib/http-client';
import type {
  AccountEntry,
  AccountSummary,
  CreateCustomerInput,
  Customer,
  CustomersList,
  ListCustomersParams,
  RegisterPaymentInput,
  UpdateCustomerInput,
} from '../../domain/types';

export const customersApiHttp = {
  list: (params: ListCustomersParams = {}) =>
    http<CustomersList>('/customers', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),

  findById: (id: string) => http<Customer>(`/customers/${id}`),

  create: (input: CreateCustomerInput) =>
    http<Customer>('/customers', { method: 'POST', body: input }),

  update: (id: string, input: UpdateCustomerInput) =>
    http<Customer>(`/customers/${id}`, { method: 'PATCH', body: input }),

  remove: (id: string) =>
    http<void>(`/customers/${id}`, { method: 'DELETE' }),

  // --- Cuenta corriente / crédito ---
  getAccountSummary: (customerId: string) =>
    http<AccountSummary>(`/customers/${customerId}/account`),

  registerPayment: (customerId: string, input: RegisterPaymentInput) =>
    http<AccountEntry>(`/customers/${customerId}/account/payments`, {
      method: 'POST',
      body: input,
    }),
};
