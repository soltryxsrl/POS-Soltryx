import { http } from '@/shared/lib/http-client';
import type {
  CreateSupplierInput,
  ListSuppliersParams,
  Supplier,
  SuppliersList,
  UpdateSupplierInput,
} from '../../domain/types';

export const suppliersApiHttp = {
  list: (params: ListSuppliersParams = {}) =>
    http<SuppliersList>('/suppliers', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),
  findById: (id: string) => http<Supplier>(`/suppliers/${id}`),
  create: (input: CreateSupplierInput) =>
    http<Supplier>('/suppliers', { method: 'POST', body: input }),
  update: (id: string, input: UpdateSupplierInput) =>
    http<Supplier>(`/suppliers/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => http<void>(`/suppliers/${id}`, { method: 'DELETE' }),
};
