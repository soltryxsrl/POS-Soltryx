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

/**
 * ¿Está habilitada la función multi-sucursal? Default `true` mientras carga
 * (para no ocultar UI por un parpadeo). Lo usan el nav, el selector de sucursal
 * y el toggle consolidado de reportes.
 */
export function useMultiBranch(): boolean {
  const plan = usePlan();
  return plan.data?.multiBranchEnabled ?? true;
}

/** Upsell del plan (super-admin). Requiere el secreto; refresca el plan al éxito. */
export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      secret: string;
      maxUsers: number | null;
      maxBranches: number | null;
      multiBranchEnabled?: boolean;
    }) =>
      planApiHttp.update(input.secret, {
        maxUsers: input.maxUsers,
        maxBranches: input.maxBranches,
        multiBranchEnabled: input.multiBranchEnabled,
      }),
    onSuccess: (data) => {
      qc.setQueryData(planKey, data);
      void qc.invalidateQueries({ queryKey: planKey });
    },
  });
}
