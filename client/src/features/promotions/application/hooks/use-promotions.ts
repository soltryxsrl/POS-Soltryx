'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { promotionsApiHttp } from '../../infrastructure/api/promotions.api.http';
import type {
  CreatePromotionInput,
  ListPromotionsParams,
  UpdatePromotionInput,
} from '../../domain/types';

export const promotionsKey = {
  all: ['promotions'] as const,
  list: (params: ListPromotionsParams) => ['promotions', 'list', params] as const,
  byId: (id: string) => ['promotions', 'byId', id] as const,
};

export function usePromotions(params: ListPromotionsParams = {}) {
  return useQuery({
    queryKey: promotionsKey.list(params),
    queryFn: () => promotionsApiHttp.list(params),
  });
}

export function usePromotion(id: string | undefined) {
  return useQuery({
    queryKey: promotionsKey.byId(id ?? '__none__'),
    queryFn: () => promotionsApiHttp.findById(id!),
    enabled: !!id,
  });
}

export function useCreatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePromotionInput) => promotionsApiHttp.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: promotionsKey.all }),
  });
}

export function useUpdatePromotion(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePromotionInput) => promotionsApiHttp.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promotionsKey.all });
      qc.invalidateQueries({ queryKey: promotionsKey.byId(id) });
    },
  });
}

export function useDeletePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => promotionsApiHttp.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: promotionsKey.all }),
  });
}
