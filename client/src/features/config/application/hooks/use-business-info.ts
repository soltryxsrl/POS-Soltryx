'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { configApiHttp } from '../../infrastructure/api/config.api.http';
import type { UpdateBusinessInput } from '../../domain/types';

export const businessInfoKey = ['config', 'business'] as const;

export function useBusinessInfo() {
  return useQuery({
    queryKey: businessInfoKey,
    queryFn: configApiHttp.getBusiness,
    // Los datos del negocio cambian rara vez — cachear agresivo.
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function useUpdateBusinessInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBusinessInput) => configApiHttp.updateBusiness(input),
    onSuccess: (data) => {
      // Sembramos el cache con el nuevo valor para que la UI lo refleje al instante
      // (recibos abiertos, header del receipt, etc.).
      qc.setQueryData(businessInfoKey, data);
    },
  });
}
