/**
 * Matemática pura del reembolso de una línea devuelta. Replica la matemática de
 * la VENTA (sale-totals-calculator + bloque fiscal de create-sale):
 *
 *   - Modo ITBIS-incluido: el precio mostrado ES el total de línea (el impuesto
 *     se back-calcula, no se suma encima).
 *   - El descuento de línea se prorratea por la fracción devuelta.
 *   - El descuento de orden (post-impuesto) se prorratea por el peso de la
 *     fracción devuelta sobre el total de líneas de la venta — espejo de cómo
 *     el comprobante fiscal distribuye el descuento de orden.
 *   - El desglose base/ITBIS del reembolso es tax-inclusive (igual que el
 *     comprobante: el descuento de orden reduce base e impuesto en proporción).
 *
 * Todo en centavos (enteros) para evitar ruido de punto flotante.
 */
export interface ReturnLineInput {
  /** Precio unitario snapshot de la línea (string decimal, 2 dec). */
  unitPrice: string;
  /** Cantidad devuelta (hasta 3 decimales). */
  quantityReturned: number;
  /** Cantidad original vendida de la línea. */
  originalQuantity: number;
  /** Descuento total de la línea original (string decimal). */
  lineDiscount: string;
  /** Tasa de ITBIS de la línea (string decimal, p.ej. '18.00'). */
  taxRate: string;
  /** Snapshot del modo de precio de la venta. */
  priceIncludesTax: boolean;
  /** Descuento de orden de la venta completa, en centavos. */
  orderDiscountCents: number;
  /** Σ total de TODAS las líneas de la venta (sale_items.total), en centavos. */
  saleLinesTotalCents: number;
}

export interface ReturnLineAmounts {
  /** Bruto de la fracción devuelta (unitPrice × qty), en centavos. */
  grossCents: number;
  /** Descuento de línea prorrateado a la fracción devuelta, en centavos. */
  proratedLineDiscountCents: number;
  /** Parte del descuento de orden atribuible a esta fracción, en centavos. */
  orderDiscountShareCents: number;
  /** Base imponible del reembolso, en centavos. */
  baseCents: number;
  /** ITBIS del reembolso, en centavos. */
  taxCents: number;
  /** Total a devolver al cliente, en centavos. */
  refundCents: number;
}

export function computeReturnLineAmounts(input: ReturnLineInput): ReturnLineAmounts {
  const unitC = Math.round(parseFloat(input.unitPrice) * 100);
  const grossC = Math.round(unitC * input.quantityReturned);
  const discountC = Math.round(parseFloat(input.lineDiscount || '0') * 100);
  const proratedDiscountC =
    input.originalQuantity > 0
      ? Math.round((discountC * input.quantityReturned) / input.originalQuantity)
      : 0;
  const afterDiscC = Math.max(0, grossC - proratedDiscountC);
  const taxBp = Math.round(parseFloat(input.taxRate) * 100);

  // Lo que el cliente pagó por la fracción devuelta (antes del descuento de
  // orden): con ITBIS incluido es el neto tal cual; si no, neto + ITBIS.
  const linePaidC = input.priceIncludesTax
    ? afterDiscC
    : afterDiscC + Math.round((afterDiscC * taxBp) / 10000);

  const orderShareC =
    input.orderDiscountCents > 0 && input.saleLinesTotalCents > 0
      ? Math.round((input.orderDiscountCents * linePaidC) / input.saleLinesTotalCents)
      : 0;
  const refundC = Math.max(0, linePaidC - orderShareC);

  // Desglose base/ITBIS tax-inclusive del monto reembolsado.
  const baseC = Math.round((refundC * 10000) / (10000 + taxBp));
  const taxC = refundC - baseC;

  return {
    grossCents: grossC,
    proratedLineDiscountCents: proratedDiscountC,
    orderDiscountShareCents: orderShareC,
    baseCents: baseC,
    taxCents: taxC,
    refundCents: refundC,
  };
}
