import { expect, test } from './fixtures';
import { api } from './helpers/api';

/**
 * Verifica el endpoint `POST /api/fiscal/documents/standalone`:
 *   1. Emite E41 (compra informal) y E43 (gasto menor) — devuelve NCF con
 *      padding e-CF (10 dígitos).
 *   2. Ambos quedan registrados en /fiscal/documents y aparecen en el 606.
 *   3. El tipo de bienes/servicios en el 606 es '11' para gastos menores y
 *      '09' (default) para compras informales.
 *   4. Validación: docType no permitido (ej. B02 que es venta) → 400.
 */

test.describe.serial('Fiscal standalone docs (E41/E43/B11/B13)', () => {
  let e41Ncf = '';
  let e43Ncf = '';
  const today = new Date().toISOString().slice(0, 10);

  test('emite E41 (compra informal) con NCF e-CF de 10 dígitos', async () => {
    const result = await api<{ ncf: string; docType: string; saleId: string | null }>(
      '/fiscal/documents/standalone',
      {
        method: 'POST',
        body: JSON.stringify({
          docTypeCode: 'E41',
          counterpartyName: 'E2E Vendedor Informal',
          counterpartyRnc: '00112345678',
          subtotal: '200.00',
          taxTotal: '0.00',
          total: '200.00',
        }),
      },
    );
    expect(result.docType).toBe('E41');
    expect(result.ncf).toMatch(/^E41\d{10}$/);
    expect(result.saleId).toBeNull();
    e41Ncf = result.ncf;
  });

  test('emite E43 (gasto menor) sin contraparte RNC', async () => {
    const result = await api<{ ncf: string; docType: string; buyerName: string | null }>(
      '/fiscal/documents/standalone',
      {
        method: 'POST',
        body: JSON.stringify({
          docTypeCode: 'E43',
          counterpartyName: 'E2E Parqueo',
          subtotal: '75.00',
          total: '75.00',
        }),
      },
    );
    expect(result.docType).toBe('E43');
    expect(result.ncf).toMatch(/^E43\d{10}$/);
    expect(result.buyerName).toBe('E2E Parqueo');
    e43Ncf = result.ncf;
  });

  test('606 incluye E41 con tipoBienesServicios=09 y E43 con 11', async () => {
    const report = await api<{
      rows: Array<{
        ncf: string;
        supplierFiscalDocTypeCode: string;
        tipoBienesServicios: string;
        supplierName: string;
      }>;
    }>(`/fiscal/reports/606?from=${today}&to=${today}`);

    const e41Row = report.rows.find((r) => r.ncf === e41Ncf);
    const e43Row = report.rows.find((r) => r.ncf === e43Ncf);
    expect(e41Row).toBeDefined();
    expect(e41Row!.supplierFiscalDocTypeCode).toBe('E41');
    expect(e41Row!.tipoBienesServicios).toBe('09');
    expect(e41Row!.supplierName).toBe('E2E Vendedor Informal');

    expect(e43Row).toBeDefined();
    expect(e43Row!.supplierFiscalDocTypeCode).toBe('E43');
    expect(e43Row!.tipoBienesServicios).toBe('11');
  });

  test('docType no permitido (B02 = venta) → 400', async () => {
    const API_BASE = 'http://localhost:3001/api';
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'admin@t1et.local',
        password: 'Admin123!',
      }),
    });
    const { accessToken } = (await loginRes.json()) as { accessToken: string };
    const res = await fetch(`${API_BASE}/fiscal/documents/standalone`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        docTypeCode: 'B02',
        subtotal: '100',
        total: '100',
      }),
    });
    expect(res.status).toBe(400);
  });
});
