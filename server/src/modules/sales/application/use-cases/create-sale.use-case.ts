import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../../common/persistence/unit-of-work.port';
import {
  STOCK_MOVEMENT_RECORDER,
  type StockMovementRecorder,
} from '../../../inventory/domain/ports/stock-movement-recorder.port';
import { StockMovementType } from '../../../inventory/domain/entities/stock-movement-type';
import type { Sale } from '../../domain/entities/sale.entity';
import {
  CashSessionMismatchError,
  PaymentInsufficientError,
  ProductNotForSaleError,
  SaleHasNoItemsError,
  SaleHasNoPaymentsError,
} from '../../domain/errors/sale.errors';
import {
  CASH_SESSION_VALIDATOR_PORT,
  type CashSessionValidatorPort,
} from '../../domain/ports/cash-session-validator.port';
import {
  PRODUCT_PRICING_PORT,
  type ProductPricingPort,
} from '../../domain/ports/product-pricing.port';
import {
  SALE_NUMBER_GENERATOR,
  type SaleNumberGenerator,
} from '../../domain/ports/sale-number-generator.port';
import {
  SALE_REPOSITORY,
  type SaleRepository,
} from '../../domain/ports/sale.repository.port';
import { SaleTotalsCalculator } from '../../domain/services/sale-totals-calculator';
import { compareMoney, toCents, fromCents } from '../../domain/services/money';
import type { PaymentMethod } from '../../domain/value-objects/payment-method';

export interface CreateSaleInput {
  cashSessionId: string;
  customerId?: string | null;
  notes?: string | null;
  userId: string;
  /** Si es CASHIER, validamos que la sesión sea suya. Para ADMIN/MANAGER, false. */
  enforceSessionOwnership: boolean;
  items: Array<{
    productId: string;
    /** Cantidad con hasta 3 decimales. */
    quantity: string;
    /** Descuento en moneda (no porcentaje). Opcional. */
    discount?: string;
  }>;
  payments: Array<{
    method: PaymentMethod;
    amount: string;
    reference?: string | null;
  }>;
}

@Injectable()
export class CreateSaleUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CASH_SESSION_VALIDATOR_PORT)
    private readonly sessionValidator: CashSessionValidatorPort,
    @Inject(PRODUCT_PRICING_PORT) private readonly pricing: ProductPricingPort,
    @Inject(SALE_NUMBER_GENERATOR) private readonly numbers: SaleNumberGenerator,
    @Inject(SALE_REPOSITORY) private readonly saleRepo: SaleRepository,
    @Inject(STOCK_MOVEMENT_RECORDER)
    private readonly stockRecorder: StockMovementRecorder,
    private readonly totals: SaleTotalsCalculator,
  ) {}

  async execute(input: CreateSaleInput): Promise<Sale> {
    if (input.items.length === 0) throw new SaleHasNoItemsError();
    if (input.payments.length === 0) throw new SaleHasNoPaymentsError();

    const session = await this.sessionValidator.validateOpen(
      input.cashSessionId,
      input.enforceSessionOwnership ? input.userId : undefined,
    );
    if (!session) throw new CashSessionMismatchError();

    return this.uow.run(async (ctx) => {
      // 1) Cargar snapshots de productos desde el SERVER (no confiar en el cliente)
      const productIds = [...new Set(input.items.map((i) => i.productId))];
      const products = await this.pricing.findManyForSale(ctx, productIds);
      const byId = new Map(products.map((p) => [p.id, p]));

      // 2) Validar cada producto + construir líneas con snapshot de precio/tax/nombre
      const lines = input.items.map((it) => {
        const p = byId.get(it.productId);
        if (!p) throw new ProductNotForSaleError(it.productId, 'no encontrado');
        if (!p.isActive) throw new ProductNotForSaleError(it.productId, 'inactivo');
        return {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          quantity: it.quantity,
          unitPrice: p.salePrice,
          discount: it.discount ?? '0.00',
          taxRate: p.taxRate,
        };
      });

      // 3) Calcular totales server-side
      const computed = this.totals.compute(lines);

      // 4) Validar pagos: suma >= total
      const paidCents = input.payments.reduce(
        (acc, p) => acc + toCents(p.amount),
        0,
      );
      const totalCents = toCents(computed.total);
      if (paidCents < totalCents) {
        throw new PaymentInsufficientError(computed.total, fromCents(paidCents));
      }

      // 5) Generar sale_number desde la sequence (concurrent-safe)
      const saleNumber = await this.numbers.next(ctx);

      // 6) Persistir sale + items + payments
      const sale = await this.saleRepo.insert(ctx, {
        branchId: session.branchId,
        saleNumber,
        customerId: input.customerId ?? null,
        userId: input.userId,
        cashSessionId: session.id,
        subtotal: computed.subtotal,
        discountTotal: computed.discountTotal,
        taxTotal: computed.taxTotal,
        total: computed.total,
        notes: input.notes ?? null,
        items: computed.lines.map((l, idx) => {
          const original = lines[idx];
          if (!original) throw new Error('line index mismatch');
          return {
            productId: l.productId,
            productNameSnapshot: original.name,
            productSkuSnapshot: original.sku,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discount: l.discount,
            taxRate: l.taxRate,
            taxTotal: l.taxTotal,
            total: l.lineTotal,
          };
        }),
        payments: input.payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          reference: p.reference ?? null,
        })),
      });

      // 7) Decrementar stock de cada producto (un movimiento SALE por línea)
      //    El recorder hace FOR UPDATE → serializa concurrentes
      //    y lanza InsufficientStockError si el stock no alcanza (revierte toda la tx).
      for (const line of computed.lines) {
        await this.stockRecorder.record(ctx, {
          productId: line.productId,
          type: StockMovementType.SALE,
          quantity: line.quantity,
          reason: `Venta ${saleNumber}`,
          saleId: sale.id,
          userId: input.userId,
          branchId: session.branchId,
        });
      }

      // 8) Devolver la venta tal como la persistió `insert()` — los items/payments
      //    ya vienen poblados. Los stock_movements no modifican la sale en sí.
      return sale;
    });
  }
}

/** Calcula vuelto (change) si el pago en efectivo excede el total. */
export function computeChange(totalPaid: string, total: string): string {
  if (compareMoney(totalPaid, total) <= 0) return '0.00';
  return fromCents(toCents(totalPaid) - toCents(total));
}
