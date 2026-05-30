'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentMethodsApiHttp } from '../../infrastructure/api/payment-methods.api.http';
import type { UpdatePaymentMethodInput } from '../../domain/types';

/**
 * Etiqueta canónica por clase de comportamiento. Se usa como respaldo cuando el
 * catálogo aún no cargó o referencia un código desconocido. Coincide con los
 * nombres sembrados por defecto.
 */
export const PAYMENT_METHOD_CANONICAL_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  ACCOUNT: 'Crédito',
  OTHER: 'Otro',
};

export function paymentMethodLabel(
  code: string,
  names?: Record<string, string>,
): string {
  return names?.[code] ?? PAYMENT_METHOD_CANONICAL_LABEL[code] ?? code;
}

export const paymentMethodsKey = {
  all: ['payment-methods'] as const,
  list: (params: { activeOnly?: boolean } = {}) =>
    ['payment-methods', params] as const,
};

export function usePaymentMethods(params: { activeOnly?: boolean } = {}) {
  return useQuery({
    queryKey: paymentMethodsKey.list(params),
    queryFn: () => paymentMethodsApiHttp.list(params),
  });
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      code,
      input,
    }: {
      code: string;
      input: UpdatePaymentMethodInput;
    }) => paymentMethodsApiHttp.update(code, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: paymentMethodsKey.all }),
  });
}

export function useSetDefaultPaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => paymentMethodsApiHttp.setDefault(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: paymentMethodsKey.all }),
  });
}

/**
 * Devuelve `labelOf(code)` que traduce un código de forma de pago a su nombre
 * configurado en el catálogo, con la etiqueta canónica como respaldo. Lee TODAS
 * las formas (no solo activas) para que un método desactivado siga resolviendo
 * su nombre en recibos/reportes históricos.
 */
export function usePaymentMethodLabel(): (code: string) => string {
  const { data } = usePaymentMethods();
  return useMemo(() => {
    const names = Object.fromEntries((data ?? []).map((m) => [m.code, m.name]));
    return (code: string) => paymentMethodLabel(code, names);
  }, [data]);
}
