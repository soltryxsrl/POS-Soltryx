'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/shared/lib/http-client';
import type { MoneyDto } from '@/shared/types/enums';

export interface AppliedPromotion {
  promotionId: string;
  promotionName: string;
  type:
    | 'PRODUCT_PERCENT_OFF'
    | 'PRODUCT_AMOUNT_OFF'
    | 'PRODUCT_BUY_X_GET_Y'
    | 'ORDER_PERCENT_OFF'
    | 'ORDER_AMOUNT_OFF';
  discountAmount: MoneyDto;
  productId?: string;
}

export interface PreviewTotalsResponse {
  subtotal: MoneyDto;
  discountTotal: MoneyDto;
  orderDiscount: MoneyDto;
  taxTotal: MoneyDto;
  tipTotal: MoneyDto;
  total: MoneyDto;
  promotionsTotal: MoneyDto;
  appliedPromotions: AppliedPromotion[];
}

interface PreviewTotalsInput {
  items: Array<{
    productId?: string | null;
    variantId?: string | null;
    /** Monto libre: descripción de la línea (sin producto del catálogo). */
    description?: string | null;
    /** Monto libre: precio unitario tecleado por el cajero. */
    unitPrice?: MoneyDto;
    /** Monto libre: tasa de ITBIS. */
    taxRate?: string;
    quantity: string;
    discount?: MoneyDto;
  }>;
  orderDiscount?: MoneyDto;
  tipTotal?: MoneyDto;
}

/**
 * Debounced hook que llama al servidor para obtener el total REAL de la venta
 * incluyendo el impacto de promociones. Útil para que el POS muestre el total
 * correcto antes de cobrar.
 *
 * Devuelve `null` mientras no haya items, mientras el debounce espera, o si
 * el fetch falla — el caller cae a su cálculo local en ese caso.
 */
export function usePreviewTotals(
  input: PreviewTotalsInput,
  options: { debounceMs?: number } = {},
): PreviewTotalsResponse | null {
  const debounceMs = options.debounceMs ?? 250;
  const stableKey = useMemo(
    () =>
      JSON.stringify({
        items: input.items.map((i) => ({
          p: i.productId ?? null,
          v: i.variantId ?? null,
          desc: i.description ?? null,
          up: i.unitPrice ?? null,
          tr: i.taxRate ?? null,
          q: i.quantity,
          d: i.discount ?? '0.00',
        })),
        od: input.orderDiscount ?? '0.00',
        tip: input.tipTotal ?? '0.00',
      }),
    [input.items, input.orderDiscount, input.tipTotal],
  );

  const [debouncedKey, setDebouncedKey] = useState(stableKey);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKey(stableKey), debounceMs);
    return () => clearTimeout(t);
  }, [stableKey, debounceMs]);

  const enabled = input.items.length > 0;

  const query = useQuery({
    queryKey: ['sales', 'preview-totals', debouncedKey] as const,
    queryFn: () =>
      http<PreviewTotalsResponse>('/sales/preview-totals', {
        method: 'POST',
        body: {
          items: input.items.map((i) => ({
            productId: i.productId ?? undefined,
            variantId: i.variantId ?? undefined,
            description: i.description ?? undefined,
            unitPrice: i.unitPrice ?? undefined,
            taxRate: i.taxRate ?? undefined,
            quantity: i.quantity,
            discount: i.discount,
          })),
          orderDiscount: input.orderDiscount,
          tipTotal: input.tipTotal,
        },
      }),
    enabled,
    staleTime: 5_000,
    gcTime: 60_000,
    retry: false,
  });

  return query.data ?? null;
}
