'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApiHttp } from '../../infrastructure/api/categories.api.http';
import type { CreateCategoryInput, UpdateCategoryInput } from '../../domain/types';

const categoriesKey = ['categories'] as const;

export function useCategories(params?: { q?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['categories', params ?? {}],
    queryFn: () => categoriesApiHttp.list(params),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => categoriesApiHttp.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriesKey }),
  });
}

export function useUpdateCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCategoryInput) => categoriesApiHttp.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriesKey }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApiHttp.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriesKey }),
  });
}
