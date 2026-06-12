import { CancelSaleUseCase } from './cancel-sale.use-case';
import { PaymentMethod } from '../../domain/value-objects/payment-method';
import {
  SaleHasReturnsError,
  SaleNotCancellableError,
  SaleNotFoundError,
} from '../../domain/errors/sale.errors';

/**
 * Integración de CancelSaleUseCase con ports mockeados (sin DB). Verifica la
 * reversa de stock, la reversa de crédito (CxC), la emisión de nota de crédito
 * y la marca de anulación.
 */
function makeMocks() {
  const manager = {
    update: jest.fn().mockResolvedValue(undefined),
    // Re-lectura del comprobante original (con items) para la nota de crédito.
    findOne: jest.fn().mockResolvedValue(null),
    // Lock FOR UPDATE + chequeo de devoluciones, dentro de la transacción.
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return [{ status: 'COMPLETED' }];
      if (sql.includes('sale_returns')) return [{ exists: false }];
      return [];
    }),
  };
  return {
    manager,
    uow: { run: jest.fn(async (cb: (ctx: unknown) => unknown) => cb({ manager })) },
    saleRepo: {
      findById: jest.fn(),
      findItemsForCancellation: jest.fn().mockResolvedValue([]),
      markCancelled: jest.fn(
        async (_ctx: unknown, id: string, patch: Record<string, unknown>) => ({
          id,
          status: 'CANCELLED',
          ...patch,
        }),
      ),
    },
    stockRecorder: { record: jest.fn().mockResolvedValue(undefined) },
    pricing: { findManyForSale: jest.fn().mockResolvedValue([]) },
    accountService: { recordReversal: jest.fn().mockResolvedValue(undefined) },
    audit: { record: jest.fn().mockResolvedValue(undefined) },
    fiscalDocs: { issueForSale: jest.fn().mockResolvedValue({ id: 'cn-1' }) },
  };
}

type Mocks = ReturnType<typeof makeMocks>;

function makeUseCase(m: Mocks) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return new CancelSaleUseCase(
    m.uow as any,
    m.saleRepo as any,
    m.stockRecorder as any,
    m.pricing as any,
    m.accountService as any,
    m.audit as any,
    m.fiscalDocs as any,
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

function completedSale(over: Record<string, unknown> = {}) {
  const fiscalDocument = (over.fiscalDocument ?? null) as { id: string } | null;
  return {
    id: 'sale-1',
    status: 'COMPLETED',
    saleNumber: 'V-0001',
    branchId: 'br-1',
    customerId: null,
    subtotal: '100.00',
    taxTotal: '18.00',
    total: '118.00',
    payments: [{ method: PaymentMethod.CASH, amount: '118.00' }],
    fiscalDocument: null,
    fiscalDocumentId: fiscalDocument?.id ?? null,
    ...over,
  };
}

/** Comprobante completo (con items) tal como lo re-lee la transacción. */
function invoiceRow(over: Record<string, unknown> = {}) {
  return {
    id: 'fd-1',
    docType: 'E32',
    ncf: 'E320000000001',
    status: 'ISSUED',
    buyerName: null,
    buyerRnc: null,
    // Montos del comprobante ≠ montos de la venta a propósito: la NC debe
    // copiar ESTOS (base corregida por descuento de orden / ITBIS-incluido).
    subtotal: '84.75',
    taxTotal: '15.25',
    total: '100.00',
    items: [
      {
        sequence: 1,
        description: 'Producto',
        quantity: '1',
        unitPrice: '100.00',
        discount: '15.25',
        taxRate: '18.00',
        taxTotal: '15.25',
        total: '100.00',
      },
    ],
    ...over,
  };
}

function simpleItem(over: Record<string, unknown> = {}) {
  return {
    id: 'it-1',
    saleId: 'sale-1',
    productId: 'p1',
    variantId: null,
    variantNameSnapshot: null,
    productNameSnapshot: 'Producto',
    productSkuSnapshot: 'SKU1',
    quantity: '1',
    unitPrice: '100.00',
    discount: '0.00',
    taxRate: '18.00',
    taxTotal: '18.00',
    total: '118.00',
    kitComponentsSnapshot: null,
    notes: null,
    createdAt: new Date(),
    ...over,
  };
}

const input = {
  saleId: 'sale-1',
  reason: 'Error de cobro',
  userId: 'user-1',
  branchId: 'br-1',
};

describe('CancelSaleUseCase (integración)', () => {
  it('rechaza si la venta no existe', async () => {
    const m = makeMocks();
    m.saleRepo.findById.mockResolvedValue(null);
    await expect(makeUseCase(m).execute(input)).rejects.toThrow(SaleNotFoundError);
  });

  it('rechaza si la venta no está COMPLETED', async () => {
    const m = makeMocks();
    m.saleRepo.findById.mockResolvedValue(completedSale({ status: 'CANCELLED' }));
    await expect(makeUseCase(m).execute(input)).rejects.toThrow(
      SaleNotCancellableError,
    );
  });

  it('happy path: revierte stock, marca anulada, sin nota de crédito ni CxC', async () => {
    const m = makeMocks();
    m.saleRepo.findById.mockResolvedValue(completedSale());
    m.saleRepo.findItemsForCancellation.mockResolvedValue([simpleItem()]);

    const result = await makeUseCase(m).execute(input);

    expect(m.stockRecorder.record).toHaveBeenCalledTimes(1);
    expect(m.stockRecorder.record.mock.calls[0][1]).toMatchObject({
      productId: 'p1',
      type: 'CANCELLED_SALE',
      quantity: '1',
    });
    expect(m.saleRepo.markCancelled).toHaveBeenCalledTimes(1);
    expect(m.fiscalDocs.issueForSale).not.toHaveBeenCalled();
    expect(m.accountService.recordReversal).not.toHaveBeenCalled();
    expect(result.status).toBe('CANCELLED');
  });

  it('explota el kit a sus componentes al revertir stock', async () => {
    const m = makeMocks();
    m.saleRepo.findById.mockResolvedValue(completedSale());
    m.saleRepo.findItemsForCancellation.mockResolvedValue([
      simpleItem({
        productId: 'kit-1',
        quantity: '3',
        kitComponentsSnapshot: [
          { componentProductId: 'c1', quantity: '2' },
          { componentProductId: 'c2', quantity: '1' },
        ],
      }),
    ]);

    await makeUseCase(m).execute(input);

    // 2 componentes, NO el kit; cantidades = componente × cantidad de kit.
    expect(m.stockRecorder.record).toHaveBeenCalledTimes(2);
    const recorded = m.stockRecorder.record.mock.calls.map((c) => c[1]);
    expect(recorded).toEqual([
      expect.objectContaining({ productId: 'c1', quantity: '6.000' }),
      expect.objectContaining({ productId: 'c2', quantity: '3.000' }),
    ]);
  });

  it('revierte el cargo a CxC cuando la venta fue a crédito (ACCOUNT)', async () => {
    const m = makeMocks();
    m.saleRepo.findById.mockResolvedValue(
      completedSale({
        customerId: 'cust-1',
        payments: [{ method: PaymentMethod.ACCOUNT, amount: '118.00' }],
      }),
    );
    m.saleRepo.findItemsForCancellation.mockResolvedValue([simpleItem()]);

    await makeUseCase(m).execute(input);

    expect(m.accountService.recordReversal).toHaveBeenCalledTimes(1);
    expect(m.accountService.recordReversal.mock.calls[0][1]).toMatchObject({
      customerId: 'cust-1',
      amount: '118.00',
      saleId: 'sale-1',
    });
  });

  it('emite nota de crédito E34 con los montos del COMPROBANTE original (no los de la venta)', async () => {
    const m = makeMocks();
    m.saleRepo.findById.mockResolvedValue(
      completedSale({
        fiscalDocument: {
          id: 'fd-1',
          docType: 'E32',
          ncf: 'E320000000001',
          status: 'ISSUED',
          buyerName: null,
          buyerRnc: null,
          issueDate: new Date(),
        },
      }),
    );
    m.saleRepo.findItemsForCancellation.mockResolvedValue([simpleItem()]);
    m.manager.findOne.mockResolvedValue(invoiceRow());

    await makeUseCase(m).execute(input);

    expect(m.fiscalDocs.issueForSale).toHaveBeenCalledTimes(1);
    // La NC reversa lo FACTURADO: base/ITBIS/total del comprobante (84.75 /
    // 15.25 / 100.00), no sale.subtotal bruto (100.00 / 18.00 / 118.00).
    expect(m.fiscalDocs.issueForSale.mock.calls[0][1]).toMatchObject({
      docTypeCode: 'E34',
      subtotal: '84.75',
      taxTotal: '15.25',
      total: '100.00',
    });
    // El comprobante original queda CANCELLED.
    expect(m.manager.update).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'fd-1' },
      { status: 'CANCELLED' },
    );
  });

  it('emite nota de crédito B04 para una factura NCF tradicional', async () => {
    const m = makeMocks();
    m.saleRepo.findById.mockResolvedValue(
      completedSale({
        fiscalDocument: {
          id: 'fd-2',
          docType: 'B02',
          ncf: 'B0200000001',
          status: 'ISSUED',
          buyerName: null,
          buyerRnc: null,
          issueDate: new Date(),
        },
      }),
    );
    m.saleRepo.findItemsForCancellation.mockResolvedValue([simpleItem()]);
    m.manager.findOne.mockResolvedValue(invoiceRow({ id: 'fd-2', docType: 'B02' }));

    await makeUseCase(m).execute(input);

    expect(m.fiscalDocs.issueForSale.mock.calls[0][1]).toMatchObject({
      docTypeCode: 'B04',
    });
  });

  it('rechaza anular una venta con devoluciones registradas (doble reverso)', async () => {
    const m = makeMocks();
    m.saleRepo.findById.mockResolvedValue(completedSale());
    m.manager.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return [{ status: 'COMPLETED' }];
      if (sql.includes('sale_returns')) return [{ exists: true }];
      return [];
    });

    await expect(makeUseCase(m).execute(input)).rejects.toThrow(SaleHasReturnsError);
    expect(m.stockRecorder.record).not.toHaveBeenCalled();
    expect(m.saleRepo.markCancelled).not.toHaveBeenCalled();
    expect(m.fiscalDocs.issueForSale).not.toHaveBeenCalled();
  });

  it('rechaza si el status cambió entre la lectura y el lock (carrera)', async () => {
    const m = makeMocks();
    m.saleRepo.findById.mockResolvedValue(completedSale());
    m.manager.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return [{ status: 'CANCELLED' }];
      return [];
    });

    await expect(makeUseCase(m).execute(input)).rejects.toThrow(
      SaleNotCancellableError,
    );
    expect(m.saleRepo.markCancelled).not.toHaveBeenCalled();
  });

  it('no emite nota de crédito si el comprobante no está ISSUED', async () => {
    const m = makeMocks();
    m.saleRepo.findById.mockResolvedValue(
      completedSale({
        fiscalDocument: {
          id: 'fd-3',
          docType: 'E32',
          ncf: 'E320000000009',
          status: 'CANCELLED',
          buyerName: null,
          buyerRnc: null,
          issueDate: new Date(),
        },
      }),
    );
    m.saleRepo.findItemsForCancellation.mockResolvedValue([simpleItem()]);

    await makeUseCase(m).execute(input);

    expect(m.fiscalDocs.issueForSale).not.toHaveBeenCalled();
  });
});
