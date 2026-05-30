import { expect, test } from './fixtures';
import { api, purgeProductsBySkuPrefix } from './helpers/api';

/**
 * Verifica el endpoint del 606:
 *   1. Crear proveedor con RNC, producto, y una orden de compra con NCF B01
 *   2. Endpoint JSON devuelve el row con todos los campos correctos
 *   3. TXT pipe-delimited tiene 23 columnas y formato YYYYMMDD
 *   4. Validación: si docType fiscal pero sin supplierNcf → 400
 */

const SKU_PREFIX = 'E2E-606-';
const SUPPLIER_PREFIX = 'E2E-606-SUP-';
const API_BASE = 'http://localhost:3001/api';

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

async function downloadTxt(token: string, from: string, to: string): Promise<string> {
  const res = await fetch(
    `${API_BASE}/fiscal/reports/606?from=${from}&to=${to}&format=txt`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.text();
}

async function purgeTestSuppliers(): Promise<void> {
  const list = await api<{ items: Array<{ id: string; tradeName: string }> }>(
    '/suppliers?limit=200',
  );
  for (const s of list.items ?? []) {
    if (!s.tradeName.startsWith(SUPPLIER_PREFIX)) continue;
    try {
      await api(`/suppliers/${s.id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
  }
}

test.describe.serial('Informe 606 — captura compra fiscal y generación', () => {
  let supplierId = '';
  let productId = '';
  let createdNcf = '';
  const today = new Date().toISOString().slice(0, 10);

  test.beforeAll(async () => {
    await purgeTestSuppliers();
    await purgeProductsBySkuPrefix(SKU_PREFIX);

    const supplier = await api<{ id: string }>('/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        tradeName: `${SUPPLIER_PREFIX}Suplidor A`,
        legalName: 'Suplidor A SRL',
        rnc: '101234567', // 9 dígitos
        email: 'contact@suplidora.test',
      }),
    });
    supplierId = supplier.id;

    const product = await api<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E 606 Producto',
        sku: `${SKU_PREFIX}P1`,
        salePrice: '100.00',
        taxRate: '18.00',
        initialStock: '0',
      }),
    });
    productId = product.id;
  });

  test.afterAll(async () => {
    await purgeTestSuppliers();
    await purgeProductsBySkuPrefix(SKU_PREFIX);
  });

  test('crear OC con B01 + NCF → aparece en el 606 con datos correctos', async () => {
    // NCF del proveedor: B01 + 8 dígitos
    createdNcf = `B01${String(Date.now()).slice(-8)}`;
    const po = await api<{ id: string; orderNumber: string }>('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        supplierId,
        supplierFiscalDocTypeCode: 'B01',
        supplierNcf: createdNcf,
        supplierInvoiceDate: today,
        items: [
          {
            productId,
            orderedQuantity: '10',
            unitCost: '50.00',
            taxRate: '18',
          },
        ],
      }),
    });
    expect(po.id).toBeTruthy();

    const report = await api<{
      rows: Array<{
        ncf: string;
        rncCedula: string;
        tipoIdentificacion: string;
        supplierFiscalDocTypeCode: string;
        totalFacturado: string;
        itbisFacturado: string;
      }>;
      summary: { totalRows: number; comprasConNcf: number };
    }>(`/fiscal/reports/606?from=${today}&to=${today}`);

    const row = report.rows.find((r) => r.ncf === createdNcf);
    expect(row).toBeDefined();
    expect(row!.rncCedula).toBe('101234567');
    expect(row!.tipoIdentificacion).toBe('1');
    expect(row!.supplierFiscalDocTypeCode).toBe('B01');
    // Subtotal 500 + ITBIS 18% = 590
    expect(row!.totalFacturado).toBe('590.00');
    expect(row!.itbisFacturado).toBe('90.00');
    expect(report.summary.totalRows).toBeGreaterThanOrEqual(1);
  });

  test('TXT 606 tiene 23 columnas pipe-delimited', async () => {
    const token = await getToken();
    const txt = await downloadTxt(token, today, today);
    const lines = txt.split('\n').filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThan(0);

    const line = lines.find((l) => l.includes(createdNcf));
    expect(line).toBeDefined();
    const cols = line!.split('|');
    expect(cols).toHaveLength(23);
    expect(cols[0]).toBe('101234567'); // RNC proveedor
    expect(cols[1]).toBe('1'); // tipo identificación
    expect(cols[3]).toBe(createdNcf); // NCF
    expect(cols[5]).toMatch(/^\d{8}$/); // fecha YYYYMMDD
  });

  test('crear OC con docType sin NCF → 400 BadRequest', async () => {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/purchase-orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplierId,
        supplierFiscalDocTypeCode: 'B01',
        // falta supplierNcf
        items: [
          { productId, orderedQuantity: '1', unitCost: '50.00', taxRate: '18' },
        ],
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { message: string };
    expect(body.message).toMatch(/supplierNcf/i);
  });
});
