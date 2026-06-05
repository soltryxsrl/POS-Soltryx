import { http } from '@/shared/lib/http-client';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../domain/types';

export const categoriesApiHttp = {
  list: (params?: { q?: string; isActive?: boolean }) =>
    http<Category[]>('/categories', {
      searchParams: params as Record<string, string | number | boolean | undefined> | undefined,
    }),
  findById: (id: string) => http<Category>(`/categories/${id}`),
  create: (input: CreateCategoryInput) =>
    http<Category>('/categories', { method: 'POST', body: input }),
  update: (id: string, input: UpdateCategoryInput) =>
    http<Category>(`/categories/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => http<void>(`/categories/${id}`, { method: 'DELETE' }),
};
