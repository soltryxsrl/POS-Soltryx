import { expect, test } from './fixtures';
import {
  api,
  ensureCashSessionOpen,
  purgeProductsBySkuPrefix,
  rdToday,
} from './helpers/api';

/**
 * Verifica el endpoint del 607:
 *   1. JSON con summary correcto (totales, conteo de notas crédito)
 *   2. TXT pipe-delimited con las columnas exactas que pide DGII
 *   3. NCF Modificado correctamente referenciado en notas crédito
 */

const SKU_PREFIX = 'E2E-607-';
const API_BASE = 'http://localhost:3001/api';

async function downloadTxt(token: string, from: string, to: string): Promise<string> {
  const res = await fetch(
    `${API_BASE}/fiscal/reports/607?from=${from}&to=${to}&format=txt`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.text();
}

async function getToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailOrUsername: 'admin@t1et.local',
      password: 'Admin123!',
    }),
  });
  const data = (await res.json()) as { accessToken: string };
  return data.accessToken;
}

test.describe.serial('Informe 607 — generación y formato DGII', () => {
  let productId = '';
  let saleNcfOriginal = '';
  let saleNcfCreditNote = '';
  // Rango de hoy (los specs se ejecutan secuencialmente, las ventas que cree
  // entran en este rango).
  const today = rdToday();

  test.beforeAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
    await ensureCashSessionOpen();
    const p = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E 607 Producto',
        sku: `${SKU_PREFIX}P1`,
        salePrice: '100.00',
        taxRate: '18.00',
        initialStock: '50',
      }),
    });
    productId = p.id;
  });

  test.afterAll(async () => {
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('emitir B02 + cancelar → 607 incluye factura y nota crédito con ncfModificado', async () => {
    const session = await api<{ id: string } | null>(
      '/cash-sessions/active?mine=true',
    );
    if (!session?.id) throw new Error('No active session');

    const sale = await api<{ id: string; fiscalDocument: { ncf: string } | null }>(
      '/sales',
      {
        method: 'POST',
        body: JSON.stringify({
          cashSessionId: session.id,
          fiscalDocTypeCode: 'B02',
          items: [{ productId, quantity: '1' }],
          payments: [{ method: 'CASH', amount: '120' }],
        }),
      },
    );
    const issued = await api<{ fiscalDocument: { ncf: string } }>(
      `/sales/${sale.id}`,
    );
    saleNcfOriginal = issued.fiscalDocument.ncf;

    await api(`/sales/${sale.id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'prueba 607' }),
    });
    const afterCancel = await api<{
      creditNoteFiscalDocument: { ncf: string } | null;
    }>(`/sales/${sale.id}`);
    saleNcfCreditNote = afterCancel.creditNoteFiscalDocument!.ncf;

    const report = await api<{
      rows: Array<{ ncf: string; docType: string; ncfModificado: string }>;
      summary: { totalRows: number; notasCredito: number };
    }>(`/fiscal/reports/607?from=${today}&to=${today}`);

    const original = report.rows.find((r) => r.ncf === saleNcfOriginal);
    const credit = report.rows.find((r) => r.ncf === saleNcfCreditNote);
    expect(original).toBeDefined();
    expect(original!.docType).toBe('B02');
    expect(original!.ncfModificado).toBe('');
    expect(credit).toBeDefined();
    expect(credit!.docType).toBe('B04');
    expect(credit!.ncfModificado).toBe(saleNcfOriginal);
    expect(report.summary.notasCredito).toBeGreaterThanOrEqual(1);
  });

  test('TXT pipe-delimited tiene 19 columnas y formato YYYYMMDD en fecha', async () => {
    const token = await getToken();
    const txt = await downloadTxt(token, today, today);
    const lines = txt.split('\n').filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThan(0);

    // Cada línea debe tener exactamente 18 separadores '|' (=19 columnas).
    for (const line of lines) {
      const cols = line.split('|');
      expect(cols).toHaveLength(19);
      // Columna 6: fecha YYYYMMDD (8 dígitos numéricos).
      expect(cols[5]).toMatch(/^\d{8}$/);
      // Columna 19 (forma de pago) debe ser un código de 2 dígitos.
      expect(cols[18]).toMatch(/^\d{2}$/);
    }

    // Una de las líneas debe ser la nota crédito de este test, con la columna
    // 4 (NCF Modificado) apuntando al original.
    const creditLine = lines.find((l) => l.includes(saleNcfCreditNote));
    expect(creditLine).toBeDefined();
    const cols = creditLine!.split('|');
    expect(cols[2]).toBe(saleNcfCreditNote); // col 3 = NCF
    expect(cols[3]).toBe(saleNcfOriginal); // col 4 = NCF Modificado
  });

  test('rango from > to → 400 BadRequest', async () => {
    const token = await getToken();
    const res = await fetch(
      `${API_BASE}/fiscal/reports/607?from=2026-12-01&to=2026-01-01`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(400);
  });
});
