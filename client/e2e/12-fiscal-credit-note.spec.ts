import { expect, test } from './fixtures';
import {
  api,
  ensureCashSessionOpen,
  purgeProductsBySkuPrefix,
} from './helpers/api';

/**
 * Cancelar una venta que tenía NCF emitido debe emitir automáticamente una
 * nota de crédito (E34 si la original era e-CF, B04 si tradicional) y dejar
 * el fiscal_document original en status CANCELLED.
 */

const SKU_PREFIX = 'E2E-CN-';

test.describe.serial('Cancel sale → Nota de Crédito automática', () => {
  let productId = '';

  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    await ensureCashSessionOpen();
    const p = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Nota Crédito',
        sku: `${SKU_PREFIX}P1`,
        salePrice: '100.00',
        taxRate: '0.00',
        initialStock: '50',
      }),
    });
    productId = p.id;
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('venta E32 cancelada → emite E34 con NCF correcto y marca original CANCELLED', async () => {
    const session = await api<{ id: string } | null>(
      '/cash-sessions/active?mine=true',
    );
    if (!session?.id) throw new Error('No active session');

    const sale = await api<{ id: string }>('/sales', {
      method: 'POST',
      body: JSON.stringify({
        cashSessionId: session.id,
        fiscalDocTypeCode: 'E32',
        items: [{ productId, quantity: '1' }],
        payments: [{ method: 'CASH', amount: '100' }],
      }),
    });

    const original = await api<{
      fiscalDocument: { ncf: string; docType: string; status: string };
      creditNoteFiscalDocument: unknown;
    }>(`/sales/${sale.id}`);
    expect(original.fiscalDocument.docType).toBe('E32');
    expect(original.fiscalDocument.ncf).toMatch(/^E32\d{10}$/);
    expect(original.fiscalDocument.status).toBe('ISSUED');
    expect(original.creditNoteFiscalDocument).toBeNull();

    await api(`/sales/${sale.id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'prueba E2E nota crédito' }),
    });

    const refetched = await api<{
      status: string;
      fiscalDocument: { ncf: string; status: string };
      creditNoteFiscalDocument: {
        docType: string;
        ncf: string;
        status: string;
      } | null;
    }>(`/sales/${sale.id}`);
    expect(refetched.status).toBe('CANCELLED');
    expect(refetched.fiscalDocument.status).toBe('CANCELLED');
    expect(refetched.creditNoteFiscalDocument).not.toBeNull();
    expect(refetched.creditNoteFiscalDocument!.docType).toBe('E34');
    expect(refetched.creditNoteFiscalDocument!.ncf).toMatch(/^E34\d{10}$/);
    expect(refetched.creditNoteFiscalDocument!.status).toBe('ISSUED');
  });

  test('venta B02 cancelada → emite B04', async () => {
    const session = await api<{ id: string } | null>(
      '/cash-sessions/active?mine=true',
    );
    if (!session?.id) throw new Error('No active session');

    const sale = await api<{ id: string }>('/sales', {
      method: 'POST',
      body: JSON.stringify({
        cashSessionId: session.id,
        fiscalDocTypeCode: 'B02',
        items: [{ productId, quantity: '1' }],
        payments: [{ method: 'CASH', amount: '100' }],
      }),
    });

    await api(`/sales/${sale.id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'prueba E2E B04' }),
    });

    const refetched = await api<{
      fiscalDocument: { docType: string; status: string };
      creditNoteFiscalDocument: { docType: string; ncf: string } | null;
    }>(`/sales/${sale.id}`);
    expect(refetched.fiscalDocument.docType).toBe('B02');
    expect(refetched.fiscalDocument.status).toBe('CANCELLED');
    expect(refetched.creditNoteFiscalDocument).not.toBeNull();
    expect(refetched.creditNoteFiscalDocument!.docType).toBe('B04');
    // NCF tradicional usa 8 dígitos (no 10 como e-CF).
    expect(refetched.creditNoteFiscalDocument!.ncf).toMatch(/^B04\d{8}$/);
  });

  test('venta sin NCF cancelada NO emite nota de crédito', async () => {
    const session = await api<{ id: string } | null>(
      '/cash-sessions/active?mine=true',
    );
    if (!session?.id) throw new Error('No active session');

    const sale = await api<{ id: string }>('/sales', {
      method: 'POST',
      body: JSON.stringify({
        cashSessionId: session.id,
        // sin fiscalDocTypeCode → recibo no fiscal
        items: [{ productId, quantity: '1' }],
        payments: [{ method: 'CASH', amount: '100' }],
      }),
    });

    await api(`/sales/${sale.id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'no fiscal' }),
    });

    const refetched = await api<{
      status: string;
      fiscalDocument: unknown;
      creditNoteFiscalDocument: unknown;
    }>(`/sales/${sale.id}`);
    expect(refetched.status).toBe('CANCELLED');
    expect(refetched.fiscalDocument).toBeNull();
    expect(refetched.creditNoteFiscalDocument).toBeNull();
  });
});
