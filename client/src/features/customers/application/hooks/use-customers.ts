'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllPaged } from '@/shared/lib/fetch-all-paged';
import { customersApiHttp } from '../../infrastructure/api/customers.api.http';
import type {
  CreateCustomerInput,
  ListCustomersParams,
  RegisterPaymentInput,
  UpdateCustomerInput,
} from '../../domain/types';

export const customersKey = {
  all: ['customers'] as const,
  list: (params: ListCustomersParams) => ['customers', 'list', params] as const,
  byId: (id: string) => ['customers', 'byId', id] as const,
  account: (id: string) => ['customers', 'account', id] as const,
};

export function useCustomers(
  params: ListCustomersParams = {},
  opts: { fetchAll?: boolean; cap?: number } = {},
) {
  const fetchAll = opts.fetchAll ?? false;
  const cap = opts.cap ?? 2000;
  return useQuery({
    // El sufijo separa la caché de la vista paginada vs. la de "traer todo".
    queryKey: [...customersKey.list(params), fetchAll ? `all:${cap}` : 'page'],
    queryFn: () =>
      fetchAll
        ? fetchAllPaged((p) => customersApiHttp.list(p), params, { cap })
        : customersApiHttp.list(params),
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: customersKey.byId(id ?? '__none__'),
    queryFn: () => customersApiHttp.findById(id!),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomerInput) => customersApiHttp.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: customersKey.all }),
  });
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCustomerInput) => customersApiHttp.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customersKey.all });
      qc.invalidateQueries({ queryKey: customersKey.byId(id) });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersApiHttp.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: customersKey.all }),
  });
}

export function useAccountSummary(customerId: string | undefined) {
  return useQuery({
    queryKey: customersKey.account(customerId ?? '__none__'),
    queryFn: () => customersApiHttp.getAccountSummary(customerId!),
    enabled: !!customerId,
  });
}

export function useRegisterAccountPayment(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterPaymentInput) =>
      customersApiHttp.registerPayment(customerId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customersKey.account(customerId) });
    },
  });
}
