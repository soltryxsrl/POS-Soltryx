'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { planApiHttp } from '../../infrastructure/api/plan.api.http';

export const planKey = ['plan'] as const;

/**
 * Plan contratado + uso actual (usuarios/sucursales). Lo usan las pantallas de
 * usuarios y sucursales para mostrar el uso (3/5) y deshabilitar "crear" al tope.
 * Cambia rarísimo (upsell manual) → cacheado.
 */
export function usePlan() {
  return useQuery({
    queryKey: planKey,
    queryFn: planApiHttp.get,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/** Upsell del plan (super-admin). Requiere el secreto; refresca el plan al éxito. */
export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      secret: string;
      maxUsers: number | null;
      maxBranches: number | null;
    }) =>
      planApiHttp.update(input.secret, {
        maxUsers: input.maxUsers,
        maxBranches: input.maxBranches,
      }),
    onSuccess: (data) => {
      qc.setQueryData(planKey, data);
      void qc.invalidateQueries({ queryKey: planKey });
    },
  });
}
