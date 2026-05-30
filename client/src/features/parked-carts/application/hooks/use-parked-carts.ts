'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parkedCartsApiHttp } from '../../infrastructure/api/parked-carts.api.http';
import type { CreateParkedCartInput } from '../../domain/types';

export const parkedCartsKey = {
  all: ['parked-carts'] as const,
  forSession: (cashSessionId: string) =>
    ['parked-carts', 'session', cashSessionId] as const,
};

export function useParkedCarts(cashSessionId: string | undefined) {
  return useQuery({
    queryKey: parkedCartsKey.forSession(cashSessionId ?? '__none__'),
    queryFn: () => parkedCartsApiHttp.list(cashSessionId!),
    enabled: !!cashSessionId,
  });
}

export function useCreateParkedCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateParkedCartInput) => parkedCartsApiHttp.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: parkedCartsKey.all }),
  });
}

export function useDeleteParkedCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => parkedCartsApiHttp.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: parkedCartsKey.all }),
  });
}
