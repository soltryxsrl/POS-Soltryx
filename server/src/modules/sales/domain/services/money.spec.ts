import {
  addMoney,
  applyTaxRate,
  compareMoney,
  fromCents,
  fromQty,
  isNegativeOrZero,
  multiplyMoneyByQty,
  subMoney,
  toCents,
  toQty,
  toTaxBp,
} from './money';

describe('money', () => {
  describe('toCents / fromCents', () => {
    it('convierte montos a centavos enteros', () => {
      expect(toCents('100')).toBe(10000);
      expect(toCents('100.50')).toBe(10050);
      expect(toCents('0.01')).toBe(1);
      expect(toCents('0')).toBe(0);
    });

    it('redondea al centavo más cercano', () => {
      expect(toCents('1.499')).toBe(150);
      expect(toCents('1.494')).toBe(149);
    });

    it('rechaza montos no numéricos', () => {
      expect(() => toCents('abc')).toThrow();
      expect(() => toCents('')).toThrow();
    });

    it('formatea centavos a string con 2 decimales', () => {
      expect(fromCents(10000)).toBe('100.00');
      expect(fromCents(1)).toBe('0.01');
      expect(fromCents(0)).toBe('0.00');
      expect(fromCents(-150)).toBe('-1.50');
    });

    it('round-trip toCents→fromCents es estable', () => {
      for (const v of ['0.00', '1.00', '19.99', '250.00', '1234.56']) {
        expect(fromCents(toCents(v))).toBe(v);
      }
    });
  });

  describe('toQty / fromQty (3 decimales, venta por peso)', () => {
    it('convierte cantidades a milli-unidades', () => {
      expect(toQty('1')).toBe(1000);
      expect(toQty('1.5')).toBe(1500);
      expect(toQty('0.750')).toBe(750);
    });

    it('formatea milli-unidades con 3 decimales', () => {
      expect(fromQty(1000)).toBe('1.000');
      expect(fromQty(750)).toBe('0.750');
      expect(fromQty(1500)).toBe('1.500');
    });
  });

  describe('toTaxBp', () => {
    it('convierte tasa % a basis-points×100 (2 decimales)', () => {
      expect(toTaxBp('18.00')).toBe(1800);
      expect(toTaxBp('16')).toBe(1600);
      expect(toTaxBp('0')).toBe(0);
    });
  });

  describe('multiplyMoneyByQty', () => {
    it('multiplica precio (cents) por cantidad (milli) con redondeo', () => {
      expect(multiplyMoneyByQty(10050, 1000)).toBe(10050); // 100.50 × 1
      expect(multiplyMoneyByQty(10000, 1500)).toBe(15000); // 100.00 × 1.5
      expect(multiplyMoneyByQty(333, 3000)).toBe(999); // 3.33 × 3
    });

    it('redondea fracciones de centavo (venta por peso)', () => {
      // 99.99 × 0.250 = 24.9975 → 25.00 (2499.75 cents → 2500)
      expect(multiplyMoneyByQty(9999, 250)).toBe(2500);
    });
  });

  describe('applyTaxRate', () => {
    it('aplica la tasa sobre la base (tax-exclusive)', () => {
      expect(applyTaxRate(10000, 1800)).toBe(1800); // 18% de 100
      expect(applyTaxRate(0, 1800)).toBe(0);
      expect(applyTaxRate(10000, 0)).toBe(0); // exento
    });

    it('redondea al centavo', () => {
      // 84.75 × 18% = 15.255 → 15.26
      expect(applyTaxRate(8475, 1800)).toBe(1526);
    });
  });

  describe('addMoney / subMoney / compareMoney', () => {
    it('suma y resta con precisión de centavos', () => {
      expect(addMoney('100.00', '0.50')).toBe('100.50');
      expect(subMoney('100.00', '0.50')).toBe('99.50');
      expect(subMoney('1.00', '1.50')).toBe('-0.50');
    });

    it('compara montos', () => {
      expect(compareMoney('10.00', '5.00')).toBe(1);
      expect(compareMoney('5.00', '10.00')).toBe(-1);
      expect(compareMoney('5.00', '5.00')).toBe(0);
    });
  });

  describe('isNegativeOrZero', () => {
    it('detecta montos <= 0', () => {
      expect(isNegativeOrZero('0.00')).toBe(true);
      expect(isNegativeOrZero('-1.00')).toBe(true);
      expect(isNegativeOrZero('0.01')).toBe(false);
    });
  });
});
