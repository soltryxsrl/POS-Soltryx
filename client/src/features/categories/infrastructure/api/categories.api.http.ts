import { http } from '@/shared/lib/http-client';
import type { Category } from '../../domain/types';

export const categoriesApiHttp = {
  list: (params?: { q?: string; isActive?: boolean }) =>
    http<Category[]>('/categories', {
      searchParams: params as Record<string, string | number | boolean | undefined> | undefined,
    }),
  create: (input: { name: string; description?: string; parentId?: string; isActive?: boolean }) =>
    http<Category>('/categories', { method: 'POST', body: input }),
  remove: (id: string) => http<void>(`/categories/${id}`, { method: 'DELETE' }),
};
