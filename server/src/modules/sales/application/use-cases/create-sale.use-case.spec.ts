import { CreateSaleUseCase, type CreateSaleInput } from './create-sale.use-case';
import { SaleTotalsCalculator } from '../../domain/services/sale-totals-calculator';
import { PaymentMethod } from '../../domain/value-objects/payment-method';
import {
  CashSessionMismatchError,
  CustomerRequiredForAccountError,
  DiscountOverrideRequiredError,
  OpenItemInvalidError,
  PaymentInsufficientError,
  SaleHasNoItemsError,
  SaleHasNoPaymentsError,
} from '../../domain/errors/sale.errors';

/**
 * Integración de CreateSaleUseCase: ports mockeados + SaleTotalsCalculator real
 * (la matemática de dinero se ejercita de verdad), sin base de datos. Verifica
 * la ORQUESTACIÓN: validaciones, override de descuento, emisión fiscal, CxC, etc.
 */
function makeMocks() {
  const manager = {
    findOne: jest.fn().mockResolvedValue(null),
    query: jest.fn().mockResolvedValue(undefined),
  };
  return {
    manager,
    uow: { run: jest.fn(async (cb: (ctx: unknown) => unknown) => cb({ manager })) },
    sessionValidator: {
      validateOpen: jest.fn().mockResolvedValue({
        id: 'sess-1',
        cashRegisterId: 'cr-1',
        openedById: 'user-1',
        branchId: null,
      }),
    },
    pricing: {
      findManyForSale: jest.fn().mockResolvedValue([
        {
          id: 'p1',
          name: 'Producto',
          sku: 'SKU1',
          salePrice: '100.00',
          taxRate: '18.00',
          isActive: true,
          isKit: false,
          kitComponents: [],
          hasVariants: false,
        },
      ]),
      findVariantsForSale: jest.fn().mockResolvedValue([]),
    },
    numbers: { next: jest.fn().mockResolvedValue('V-0001') },
    saleRepo: {
      insert: jest.fn(async (_ctx: unknown, input: Record<string, unknown>) => ({
        id: 'sale-1',
        ...input,
      })),
    },
    stockRecorder: { record: jest.fn().mockResolvedValue(undefined) },
    userReader: { findById: jest.fn(), findByEmailOrUsername: jest.fn() },
    hasher: { verify: jest.fn() },
    totals: new SaleTotalsCalculator(),
    accountService: { recordCharge: jest.fn().mockResolvedValue(undefined) },
    promotions: {
      evaluate: jest.fn().mockResolvedValue({
        lineDiscounts: new Map<string, string>(),
        orderDiscount: '0.00',
        applied: [],
      }),
    },
    audit: { record: jest.fn().mockResolvedValue(undefined) },
    currencies: {
      convertToBase: jest.fn(async (_code: string, amount: string) => ({
        baseAmount: amount,
        rateUsed: '1.000000',
      })),
    },
    businessSettings: {
      get: jest.fn().mockResolvedValue({
        priceIncludesTax: false,
        discountOverrideThresholdPct: '15.00',
      }),
    },
    fiscalDocs: { issueForSale: jest.fn().mockResolvedValue({ id: 'fdoc-1' }) },
  };
}

type Mocks = ReturnType<typeof makeMocks>;

function makeUseCase(m: Mocks) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return new CreateSaleUseCase(
    m.uow as any,
    m.sessionValidator as any,
    m.pricing as any,
    m.numbers as any,
    m.saleRepo as any,
    m.stockRecorder as any,
    m.userReader as any,
    m.hasher as any,
    m.totals,
    m.accountService as any,
    m.promotions as any,
    m.audit as any,
    m.currencies as any,
    m.businessSettings as any,
    m.fiscalDocs as any,
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

function baseInput(over: Partial<CreateSaleInput> = {}): CreateSaleInput {
  return {
    cashSessionId: 'sess-1',
    userId: 'user-1',
    currentUserPermissions: [],
    enforceSessionOwnership: false,
    items: [{ productId: 'p1', quantity: '1' }],
    payments: [{ method: PaymentMethod.CASH, amount: '118.00' }],
    ...over,
  };
}

/** Devuelve el objeto pasado a saleRepo.insert (los totales persistidos). */
function insertedSale(m: Mocks): Record<string, unknown> {
  return m.saleRepo.insert.mock.calls[0][1] as Record<string, unknown>;
}

describe('CreateSaleUseCase (integración)', () => {
  it('happy path: calcula totales, persiste y descuenta stock (sin fiscal)', async () => {
    const m = makeMocks();
    const sale = await makeUseCase(m).execute(baseInput());

    expect(sale.id).toBe('sale-1');
    expect(m.saleRepo.insert).toHaveBeenCalledTimes(1);
    const persisted = insertedSale(m);
    expect(persisted.subtotal).toBe('100.00');
    expect(persisted.taxTotal).toBe('18.00');
    expect(persisted.total).toBe('118.00');
    expect(persisted.priceIncludesTax).toBe(false);
    expect(m.stockRecorder.record).toHaveBeenCalledTimes(1);
    expect(m.fiscalDocs.issueForSale).not.toHaveBeenCalled();
  });

  it('ítem de monto libre: arma la línea desde el input, no toca stock y persiste productId null', async () => {
    const m = makeMocks();
    const sale = await makeUseCase(m).execute(
      baseInput({
        items: [
          { description: 'Servicio de instalación', unitPrice: '100.00', taxRate: '18.00', quantity: '1' },
        ],
      }),
    );

    expect(sale.id).toBe('sale-1');
    const persisted = insertedSale(m);
    expect(persisted.subtotal).toBe('100.00');
    expect(persisted.taxTotal).toBe('18.00');
    expect(persisted.total).toBe('118.00');
    const items = persisted.items as Array<Record<string, unknown>>;
    expect(items[0]?.productId).toBeNull();
    expect(items[0]?.productNameSnapshot).toBe('Servicio de instalación');
    expect(items[0]?.productSkuSnapshot).toBe('LIBRE');
    // No mueve inventario ni busca productos del catálogo para esa línea.
    expect(m.stockRecorder.record).not.toHaveBeenCalled();
    expect(m.pricing.findManyForSale).toHaveBeenCalledWith(expect.anything(), []);
  });

  it('rechaza ítem de monto libre sin descripción o sin precio', async () => {
    const m = makeMocks();
    await expect(
      makeUseCase(m).execute(baseInput({ items: [{ unitPrice: '100.00', quantity: '1' }] })),
    ).rejects.toThrow(OpenItemInvalidError);
  });

  it('rechaza venta sin ítems', async () => {
    const m = makeMocks();
    await expect(makeUseCase(m).execute(baseInput({ items: [] }))).rejects.toThrow(
      SaleHasNoItemsError,
    );
  });

  it('rechaza venta sin pagos', async () => {
    const m = makeMocks();
    await expect(
      makeUseCase(m).execute(baseInput({ payments: [] })),
    ).rejects.toThrow(SaleHasNoPaymentsError);
  });

  it('rechaza crédito (ACCOUNT) sin cliente', async () => {
    const m = makeMocks();
    await expect(
      makeUseCase(m).execute(
        baseInput({ payments: [{ method: PaymentMethod.ACCOUNT, amount: '118.00' }] }),
      ),
    ).rejects.toThrow(CustomerRequiredForAccountError);
  });

  it('rechaza pago insuficiente', async () => {
    const m = makeMocks();
    await expect(
      makeUseCase(m).execute(
        baseInput({ payments: [{ method: PaymentMethod.CASH, amount: '100.00' }] }),
      ),
    ).rejects.toThrow(PaymentInsufficientError);
  });

  it('rechaza si la sesión de caja no está abierta', async () => {
    const m = makeMocks();
    m.sessionValidator.validateOpen.mockResolvedValueOnce(null);
    await expect(makeUseCase(m).execute(baseInput())).rejects.toThrow(
      CashSessionMismatchError,
    );
  });

  describe('override de descuento', () => {
    // 20.00 de descuento sobre subtotal 100 = 20% > umbral 15%.
    const highDiscount = baseInput({
      items: [{ productId: 'p1', quantity: '1', discount: '20.00' }],
      payments: [{ method: PaymentMethod.CASH, amount: '94.40' }],
    });

    it('exige autorización si supera el umbral y no hay permiso ni credenciales', async () => {
      const m = makeMocks();
      await expect(makeUseCase(m).execute(highDiscount)).rejects.toThrow(
        DiscountOverrideRequiredError,
      );
      expect(m.saleRepo.insert).not.toHaveBeenCalled();
    });

    it('procede si el propio cajero tiene el permiso de override', async () => {
      const m = makeMocks();
      m.userReader.findById.mockResolvedValue({ id: 'user-1', fullName: 'Cajero Jefe' });
      const sale = await makeUseCase(m).execute({
        ...highDiscount,
        currentUserPermissions: ['sales.discount.override'],
      });
      expect(sale.id).toBe('sale-1');
      expect(insertedSale(m).discountAuthorizedBySnapshot).toBe('Cajero Jefe');
    });

    it('procede con credenciales válidas de un manager', async () => {
      const m = makeMocks();
      m.userReader.findByEmailOrUsername.mockResolvedValue({
        id: 'mgr-1',
        isActive: true,
        passwordHash: 'hash',
        permissions: ['sales.discount.override'],
        fullName: 'Gerente',
      });
      m.hasher.verify.mockResolvedValue(true);

      const sale = await makeUseCase(m).execute({
        ...highDiscount,
        overrideCredentials: { emailOrUsername: 'gerente', password: 'secret' },
      });

      expect(sale.id).toBe('sale-1');
      expect(m.hasher.verify).toHaveBeenCalledWith('secret', 'hash');
      expect(insertedSale(m).discountAuthorizedBySnapshot).toBe('Gerente');
    });
  });

  it('emite comprobante fiscal cuando se indica fiscalDocTypeCode', async () => {
    const m = makeMocks();
    await makeUseCase(m).execute(baseInput({ fiscalDocTypeCode: 'B02' }));
    expect(m.fiscalDocs.issueForSale).toHaveBeenCalledTimes(1);
    // Linkea el documento a la venta.
    expect(m.manager.query).toHaveBeenCalled();
  });

  it('carga a la cuenta del cliente en venta a crédito (ACCOUNT)', async () => {
    const m = makeMocks();
    await makeUseCase(m).execute(
      baseInput({
        customerId: 'cust-1',
        payments: [{ method: PaymentMethod.ACCOUNT, amount: '118.00' }],
      }),
    );
    expect(m.accountService.recordCharge).toHaveBeenCalledTimes(1);
    expect(m.accountService.recordCharge.mock.calls[0][1]).toMatchObject({
      customerId: 'cust-1',
      amount: '118.00',
    });
  });

  it('modo ITBIS incluido: no suma el impuesto al total', async () => {
    const m = makeMocks();
    m.businessSettings.get.mockResolvedValue({
      priceIncludesTax: true,
      discountOverrideThresholdPct: '15.00',
    });
    m.pricing.findManyForSale.mockResolvedValue([
      {
        id: 'p1',
        name: 'Producto',
        sku: 'SKU1',
        salePrice: '118.00', // ya incluye ITBIS
        taxRate: '18.00',
        isActive: true,
        isKit: false,
        kitComponents: [],
        hasVariants: false,
      },
    ]);

    await makeUseCase(m).execute(baseInput());
    const persisted = insertedSale(m);
    expect(persisted.total).toBe('118.00'); // no se suma encima
    expect(persisted.taxTotal).toBe('18.00'); // back-calculado
    expect(persisted.priceIncludesTax).toBe(true);
  });

  it('convierte pagos en moneda extranjera a la base (DOP)', async () => {
    const m = makeMocks();
    m.currencies.convertToBase.mockResolvedValue({
      baseAmount: '118.00',
      rateUsed: '59.00',
    });
    const sale = await makeUseCase(m).execute(
      baseInput({
        payments: [{ method: PaymentMethod.CASH, amount: '2.00', currencyCode: 'USD' }],
      }),
    );
    expect(sale.id).toBe('sale-1');
    expect(m.currencies.convertToBase).toHaveBeenCalledWith('USD', '2.00');
  });
});
