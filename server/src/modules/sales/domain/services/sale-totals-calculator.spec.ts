import { SaleTotalsCalculator, type RawLineInput } from './sale-totals-calculator';

describe('SaleTotalsCalculator', () => {
  const calc = new SaleTotalsCalculator();

  const line = (over: Partial<RawLineInput> = {}): RawLineInput => ({
    productId: 'p1',
    quantity: '1',
    unitPrice: '100.00',
    taxRate: '18.00',
    ...over,
  });

  describe('tax-exclusive (default)', () => {
    it('agrega el ITBIS por encima del precio', () => {
      const t = calc.compute([line({ unitPrice: '100.00' })]);
      expect(t.subtotal).toBe('100.00');
      expect(t.taxTotal).toBe('18.00');
      expect(t.total).toBe('118.00');
    });

    it('aplica descuento de línea antes del impuesto', () => {
      const t = calc.compute([line({ unitPrice: '100.00', discount: '10.00' })]);
      expect(t.discountTotal).toBe('10.00');
      // base 90 → itbis 16.20 → total 106.20
      expect(t.taxTotal).toBe('16.20');
      expect(t.total).toBe('106.20');
    });
  });

  describe('tax-inclusive (precio con ITBIS incluido)', () => {
    it('back-calcula el ITBIS y NO lo suma al total', () => {
      const t = calc.compute([line({ unitPrice: '118.00' })], '0.00', '0.00', true);
      expect(t.subtotal).toBe('118.00');
      expect(t.taxTotal).toBe('18.00'); // 118 / 1.18 = 100 neto, 18 ITBIS
      expect(t.total).toBe('118.00');
    });

    it('descuento de línea reduce el bruto y el ITBIS se recalcula', () => {
      const t = calc.compute(
        [line({ unitPrice: '118.00', discount: '18.00' })],
        '0.00',
        '0.00',
        true,
      );
      // bruto tras desc = 100.00 → neto 84.75, itbis 15.25, total 100.00
      expect(t.taxTotal).toBe('15.25');
      expect(t.total).toBe('100.00');
    });

    it('producto exento (0%) no genera ITBIS', () => {
      const t = calc.compute(
        [line({ unitPrice: '100.00', taxRate: '0.00' })],
        '0.00',
        '0.00',
        true,
      );
      expect(t.taxTotal).toBe('0.00');
      expect(t.total).toBe('100.00');
    });
  });

  it('descuento de orden y propina se aplican igual en ambos modos', () => {
    const excl = calc.compute([line({ unitPrice: '100.00' })], '8.00', '5.00');
    // 100 + 18 - 8 + 5 = 115
    expect(excl.total).toBe('115.00');

    const incl = calc.compute(
      [line({ unitPrice: '118.00' })],
      '8.00',
      '5.00',
      true,
    );
    // 118 (incl) - 8 + 5 = 115
    expect(incl.total).toBe('115.00');
  });

  describe('agregación de varias líneas', () => {
    it('suma líneas con tasas mixtas (18% gravado + exento 0%)', () => {
      const t = calc.compute([
        line({ productId: 'a', unitPrice: '100.00', taxRate: '18.00' }),
        line({ productId: 'b', unitPrice: '50.00', taxRate: '0.00' }),
      ]);
      expect(t.subtotal).toBe('150.00');
      expect(t.taxTotal).toBe('18.00'); // solo la línea gravada
      expect(t.total).toBe('168.00');
      expect(t.lines).toHaveLength(2);
    });

    it('respeta cantidad con decimales (venta por peso)', () => {
      const t = calc.compute([
        line({ unitPrice: '100.00', quantity: '2.5', taxRate: '0.00' }),
      ]);
      expect(t.subtotal).toBe('250.00');
      expect(t.total).toBe('250.00');
    });
  });

  describe('validaciones', () => {
    it('rechaza descuento de línea negativo', () => {
      expect(() => calc.compute([line({ discount: '-1.00' })])).toThrow();
    });

    it('rechaza descuento de línea mayor que el subtotal del ítem', () => {
      expect(() =>
        calc.compute([line({ unitPrice: '100.00', discount: '150.00' })]),
      ).toThrow();
    });

    it('rechaza cantidad <= 0', () => {
      expect(() => calc.compute([line({ quantity: '0' })])).toThrow();
    });

    it('rechaza propina negativa', () => {
      expect(() => calc.compute([line()], '0.00', '-1.00')).toThrow();
    });

    it('rechaza descuento de orden mayor que el total', () => {
      // total = 118.00; un descuento de orden de 200 debe rechazarse
      expect(() => calc.compute([line({ unitPrice: '100.00' })], '200.00')).toThrow();
    });
  });
});
