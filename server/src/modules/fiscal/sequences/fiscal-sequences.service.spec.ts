import { formatNcf } from './fiscal-sequences.service';

describe('formatNcf (padding DGII)', () => {
  it('e-CF (E*) usa 10 dígitos de serial → 13 chars', () => {
    expect(formatNcf('E32', 'E32', 1n)).toBe('E320000000001');
    expect(formatNcf('E31', 'E31', 999999n)).toBe('E310000999999');
    expect(formatNcf('E32', 'E32', 1n)).toHaveLength(13);
  });

  it('NCF tradicional (B*) usa 8 dígitos de serial → 11 chars', () => {
    expect(formatNcf('B02', 'B02', 1n)).toBe('B0200000001');
    expect(formatNcf('B01', 'B01', 12345678n)).toBe('B0112345678');
    expect(formatNcf('B02', 'B02', 1n)).toHaveLength(11);
  });

  it('no trunca un serial que excede el ancho de padding', () => {
    // padStart solo rellena; nunca corta. (El rango DGII no debería llegar aquí.)
    expect(formatNcf('B01', 'B01', 123456789n)).toBe('B01123456789');
  });
});
