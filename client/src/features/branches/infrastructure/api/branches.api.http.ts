import { http } from '@/shared/lib/http-client';
import type {
  Branch,
  BranchesList,
  CloneCatalogResult,
  CreateBranchInput,
  ListBranchesParams,
  UpdateBranchInput,
} from '../../domain/types';

export const branchesApiHttp = {
  list: (params: ListBranchesParams = {}) =>
    http<BranchesList>('/branches', {
      searchParams: params as Record<string, string | number | boolean | undefined>,
    }),

  findById: (id: string) => http<Branch>(`/branches/${id}`),

  create: (input: CreateBranchInput) =>
    http<Branch>('/branches', { method: 'POST', body: input }),

  update: (id: string, input: UpdateBranchInput) =>
    http<Branch>(`/branches/${id}`, { method: 'PATCH', body: input }),

  remove: (id: string) => http<void>(`/branches/${id}`, { method: 'DELETE' }),

  /**
   * Copia el catálogo de `sourceBranchId` a la sucursal ACTIVA (resuelta en el
   * servidor por el header `X-Branch-Id`). Clona categorías + productos simples.
   */
  cloneCatalog: (sourceBranchId: string) =>
    http<CloneCatalogResult>('/products/clone-catalog', {
      method: 'POST',
      body: { sourceBranchId },
    }),
};
