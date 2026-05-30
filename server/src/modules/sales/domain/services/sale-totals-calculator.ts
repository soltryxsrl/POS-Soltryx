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
  productId: string;
  quantity: string; // up to 3 decimals
  unitPrice: string; // 2 decimals (snapshot del server)
  discount?: string; // 2 decimals (cliente puede sugerir)
  taxRate: string; // 2 decimals (snapshot del server)
}

export interface CalculatedLine {
  productId: string;
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
  discountTotal: string;
  taxTotal: string;
  total: string;
  lines: CalculatedLine[];
}

@Injectable()
export class SaleTotalsCalculator {
  /**
   * Calcula totales tax-EXCLUSIVE.
   * Para cada ítem:
   *   gross    = unitPrice × quantity
   *   discount = clamp(0, discount, gross)
   *   taxable  = gross − discount
   *   tax      = taxable × (taxRate/100)
   *   total    = taxable + tax
   *
   * Sale:
   *   subtotal       = Σ gross
   *   discountTotal  = Σ discount
   *   taxTotal       = Σ tax
   *   total          = subtotal − discountTotal + taxTotal
   */
  compute(lines: ReadonlyArray<RawLineInput>): SaleTotals {
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
      const taxableCents = grossCents - requestedDiscountCents;
      const taxBp = toTaxBp(line.taxRate);
      const taxLineCents = applyTaxRate(taxableCents, taxBp);
      const lineTotalCents = taxableCents + taxLineCents;

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
        taxableBase: fromCents(taxableCents),
        taxTotal: fromCents(taxLineCents),
        lineTotal: fromCents(lineTotalCents),
      });
    }

    const subtotal = fromCents(subtotalCents);
    const discountTotal = fromCents(discountCents);
    const taxTotal = fromCents(taxCents);
    // total = subtotal - discount + tax — calculado por adición/sustracción string para consistencia
    const totalCents = subtotalCents - discountCents + taxCents;
    const total = fromCents(totalCents);

    return { subtotal, discountTotal, taxTotal, total, lines: out };
  }
}
