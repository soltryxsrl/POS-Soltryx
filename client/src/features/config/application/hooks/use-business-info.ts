'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveBranchStore } from '@/features/branches/application/stores/active-branch.store';
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

/**
 * Datos del negocio para el ENCABEZADO del recibo, con nombre/RNC/dirección de
 * la sucursal superpuestos. Pasa `saleBranchId` para imprimir el recibo de la
 * sucursal DE LA VENTA (reimpresiones); sin él, usa la sucursal activa (resuelta
 * por el header `X-Branch-Id`). La sucursal efectiva entra en la query-key para
 * refrescar al cambiar de sucursal o al cargar otra venta.
 */
export function useReceiptBusinessInfo(saleBranchId?: string | null) {
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const effective = saleBranchId ?? activeBranchId;
  return useQuery({
    queryKey: [...businessInfoKey, 'receipt', effective] as const,
    queryFn: () => configApiHttp.getReceiptBusiness(saleBranchId ?? undefined),
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
