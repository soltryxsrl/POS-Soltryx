import { computeReturnLineAmounts } from './return-refund-math';

describe('computeReturnLineAmounts', () => {
  const base = {
    lineDiscount: '0',
    orderDiscountCents: 0,
    saleLinesTotalCents: 0,
  };

  it('modo tax-EXCLUSIVE sin descuentos: reembolsa precio + ITBIS', () => {
    const r = computeReturnLineAmounts({
      ...base,
      unitPrice: '100.00',
      quantityReturned: 1,
      originalQuantity: 1,
      taxRate: '18.00',
      priceIncludesTax: false,
    });
    expect(r.refundCents).toBe(11800); // 100 + 18 de ITBIS
    expect(r.baseCents).toBe(10000);
    expect(r.taxCents).toBe(1800);
  });

  it('modo ITBIS-INCLUIDO sin descuentos: reembolsa el precio mostrado, NO le suma ITBIS encima', () => {
    const r = computeReturnLineAmounts({
      ...base,
      unitPrice: '100.00',
      quantityReturned: 1,
      originalQuantity: 1,
      taxRate: '18.00',
      priceIncludesTax: true,
    });
    // El cliente pagó RD$100 — devolverle 118 era el bug original (+18%).
    expect(r.refundCents).toBe(10000);
    // Base e ITBIS se back-calculan: 100 / 1.18 = 84.75 + 15.25.
    expect(r.baseCents).toBe(8475);
    expect(r.taxCents).toBe(1525);
    expect(r.baseCents + r.taxCents).toBe(r.refundCents);
  });

  it('prorratea el descuento de línea por la fracción devuelta', () => {
    // Vendidas 4 unidades @50 con RD$20 de descuento de línea; devuelve 2.
    const r = computeReturnLineAmounts({
      ...base,
      unitPrice: '50.00',
      quantityReturned: 2,
      originalQuantity: 4,
      lineDiscount: '20.00',
      taxRate: '18.00',
      priceIncludesTax: false,
    });
    expect(r.proratedLineDiscountCents).toBe(1000); // 20 × 2/4 = 10
    // neto = 100 − 10 = 90 → + 18% = 106.20
    expect(r.refundCents).toBe(10620);
  });

  it('prorratea el descuento de ORDEN (post-impuesto) por el peso de la fracción', () => {
    // Venta tax-exclusive de una sola línea: total líneas 118.00, descuento de
    // orden 18.00. Devolución total → reembolso = 118 − 18 = 100.
    const r = computeReturnLineAmounts({
      ...base,
      unitPrice: '100.00',
      quantityReturned: 1,
      originalQuantity: 1,
      taxRate: '18.00',
      priceIncludesTax: false,
      orderDiscountCents: 1800,
      saleLinesTotalCents: 11800,
    });
    expect(r.orderDiscountShareCents).toBe(1800);
    expect(r.refundCents).toBe(10000);
    expect(r.baseCents + r.taxCents).toBe(r.refundCents);
  });

  it('descuento de orden en devolución PARCIAL: solo la parte proporcional', () => {
    // 2 unidades @100 tax-inclusive (líneas = 200.00), orden con 20.00 de
    // descuento. Devuelve 1 → pagó efectivamente 90 por esa unidad.
    const r = computeReturnLineAmounts({
      ...base,
      unitPrice: '100.00',
      quantityReturned: 1,
      originalQuantity: 2,
      taxRate: '18.00',
      priceIncludesTax: true,
      orderDiscountCents: 2000,
      saleLinesTotalCents: 20000,
    });
    expect(r.orderDiscountShareCents).toBe(1000); // 20 × (100/200)
    expect(r.refundCents).toBe(9000);
  });

  it('línea exenta (taxRate 0): base = reembolso, ITBIS 0', () => {
    const r = computeReturnLineAmounts({
      ...base,
      unitPrice: '75.50',
      quantityReturned: 2,
      originalQuantity: 2,
      taxRate: '0.00',
      priceIncludesTax: true,
    });
    expect(r.refundCents).toBe(15100);
    expect(r.taxCents).toBe(0);
    expect(r.baseCents).toBe(15100);
  });

  it('nunca devuelve montos negativos aunque el descuento exceda el bruto', () => {
    const r = computeReturnLineAmounts({
      ...base,
      unitPrice: '10.00',
      quantityReturned: 1,
      originalQuantity: 1,
      lineDiscount: '15.00',
      taxRate: '18.00',
      priceIncludesTax: false,
    });
    expect(r.refundCents).toBe(0);
    expect(r.baseCents).toBe(0);
    expect(r.taxCents).toBe(0);
  });

  it('cantidades fraccionarias (venta por peso) redondean a centavo', () => {
    // 0.455 kg @ 125.99/kg, tax-inclusive 18%.
    const r = computeReturnLineAmounts({
      ...base,
      unitPrice: '125.99',
      quantityReturned: 0.455,
      originalQuantity: 0.455,
      taxRate: '18.00',
      priceIncludesTax: true,
    });
    expect(r.refundCents).toBe(Math.round(12599 * 0.455)); // 5733
    expect(r.baseCents + r.taxCents).toBe(r.refundCents);
  });
});
