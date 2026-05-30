'use client';

import { useQuery } from '@tanstack/react-query';
import { categoriesApiHttp } from '../../infrastructure/api/categories.api.http';

export function useCategories(params?: { q?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['categories', params ?? {}],
    queryFn: () => categoriesApiHttp.list(params),
  });
}
