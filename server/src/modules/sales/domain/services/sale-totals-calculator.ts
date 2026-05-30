import { Injectable } from '@nestjs/common';
import { InvalidDiscountError } from '../errors/sale.errors';
import {
  applyTaxRate,
  fromCents,
  multiplyMoneyByQty,
  toCents,
  toQty,
  toTaxBp,
} from './money';

export interface RawLineInput {
  /** Null para líneas de "monto libre" (sin producto del catálogo). */
  productId: string | null;
  quantity: string; // up to 3 decimals
  unitPrice: string; // 2 decimals (snapshot del server)
  discount?: string; // 2 decimals (cliente puede sugerir)
  taxRate: string; // 2 decimals (snapshot del server)
}

export interface CalculatedLine {
  productId: string | null;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  /** Subtotal ítem antes de descuento = unitPrice * quantity */
  grossSubtotal: string;
  /** Base sobre la que se calcula el impuesto: gross - discount */
  taxableBase: string;
  taxTotal: string;
  /** total ítem = taxableBase + tax */
  lineTotal: string;
}

export interface SaleTotals {
  /** Σ(unitPrice × quantity) antes de descuentos/impuestos */
  subtotal: string;
  /** Σ descuentos por línea */
  discountTotal: string;
  /** Descuento global a la orden (post-impuesto). */
  orderDiscount: string;
  taxTotal: string;
  /** Propina cobrada (no afecta ITBIS). */
  tipTotal: string;
  total: string;
  lines: CalculatedLine[];
}

@Injectable()
export class SaleTotalsCalculator {
  /**
   * Calcula totales tax-EXCLUSIVE.
   * Para cada ítem:
   *   gross    = unitPrice × quantity
   *   discount = clamp(0, discount, gross)        // descuento por línea
   *   taxable  = gross − discount
   *   tax      = taxable × (taxRate/100)
   *   total    = taxable + tax
   *
   * Sale:
   *   subtotal       = Σ gross
   *   discountTotal  = Σ discount (líneas)
   *   taxTotal       = Σ tax
   *   orderDiscount  = clamp(0, input, subtotal − discountTotal + taxTotal)
   *   total          = subtotal − discountTotal + taxTotal − orderDiscount
   *
   * Modelo: orderDiscount es POST-impuesto. El ITBIS se calcula sobre el
   * precio neto por línea (gross − line.discount). El descuento global se
   * aplica al final como reducción del total, sin modificar el ITBIS. Esto
   * mantiene el desglose por-línea consistente y simplifica el receipt.
   */
  compute(
    lines: ReadonlyArray<RawLineInput>,
    orderDiscountInput: string = '0.00',
    tipInput: string = '0.00',
    /**
     * Si true, los `unitPrice` YA incluyen ITBIS (precio con impuesto incluido,
     * la norma del retail RD). El ITBIS se back-calcula desde el bruto y NO se
     * vuelve a sumar al total. Si false (default), es tax-exclusive y el ITBIS
     * se agrega por encima.
     */
    priceIncludesTax: boolean = false,
  ): SaleTotals {
    let subtotalCents = 0;
    let discountCents = 0;
    let taxCents = 0;
    const out: CalculatedLine[] = [];

    for (const line of lines) {
      const unitCents = toCents(line.unitPrice);
      const qtyMilli = toQty(line.quantity);
      if (qtyMilli <= 0) {
        throw new InvalidDiscountError(`Cantidad debe ser > 0 (productId=${line.productId})`);
      }
      const grossCents = multiplyMoneyByQty(unitCents, qtyMilli);

      const requestedDiscountCents = line.discount ? toCents(line.discount) : 0;
      if (requestedDiscountCents < 0) {
        throw new InvalidDiscountError('Descuento no puede ser negativo');
      }
      if (requestedDiscountCents > grossCents) {
        throw new InvalidDiscountError(
          `Descuento (${line.discount}) mayor que subtotal del ítem (${fromCents(grossCents)})`,
        );
      }
      const afterDiscountCents = grossCents - requestedDiscountCents;
      const taxBp = toTaxBp(line.taxRate);
      // La base gravable (neto) y el ITBIS dependen de si el precio ya incluye
      // el impuesto.
      let taxableBaseCents: number;
      let taxLineCents: number;
      let lineTotalCents: number;
      if (priceIncludesTax) {
        // unitPrice incluye ITBIS → neto = bruto / (1 + tasa). taxBp está en
        // centésimas de % (1800 = 18.00%), así que el divisor es 10000 + taxBp.
        taxableBaseCents = Math.round(
          (afterDiscountCents * 10000) / (10000 + taxBp),
        );
        taxLineCents = afterDiscountCents - taxableBaseCents;
        lineTotalCents = afterDiscountCents; // el cliente paga el precio mostrado
      } else {
        taxableBaseCents = afterDiscountCents;
        taxLineCents = applyTaxRate(afterDiscountCents, taxBp);
        lineTotalCents = afterDiscountCents + taxLineCents;
      }

      subtotalCents += grossCents;
      discountCents += requestedDiscountCents;
      taxCents += taxLineCents;

      out.push({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: fromCents(requestedDiscountCents),
        taxRate: line.taxRate,
        grossSubtotal: fromCents(grossCents),
        taxableBase: fromCents(taxableBaseCents),
        taxTotal: fromCents(taxLineCents),
        lineTotal: fromCents(lineTotalCents),
      });
    }

    const subtotal = fromCents(subtotalCents);
    const discountTotal = fromCents(discountCents);
    const taxTotal = fromCents(taxCents);
    // En modo "precio incluye ITBIS" el impuesto ya está dentro del subtotal,
    // así que NO se vuelve a sumar al total.
    const grossTotalCents = priceIncludesTax
      ? subtotalCents - discountCents
      : subtotalCents - discountCents + taxCents;

    const orderDiscountCents = toCents(orderDiscountInput);
    if (orderDiscountCents < 0) {
      throw new InvalidDiscountError('Descuento de orden no puede ser negativo');
    }
    if (orderDiscountCents > grossTotalCents) {
      throw new InvalidDiscountError(
        `Descuento de orden (${orderDiscountInput}) mayor que el total (${fromCents(grossTotalCents)})`,
      );
    }

    const tipCents = toCents(tipInput);
    if (tipCents < 0) {
      throw new InvalidDiscountError('Propina no puede ser negativa');
    }

    // total = subtotal − discountTotal + taxTotal − orderDiscount + tipTotal
    const totalCents = grossTotalCents - orderDiscountCents + tipCents;

    return {
      subtotal,
      discountTotal,
      orderDiscount: fromCents(orderDiscountCents),
      taxTotal,
      tipTotal: fromCents(tipCents),
      total: fromCents(totalCents),
      lines: out,
    };
  }
}
