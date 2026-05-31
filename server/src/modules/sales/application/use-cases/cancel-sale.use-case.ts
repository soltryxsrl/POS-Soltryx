import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../../common/persistence/unit-of-work.port';
import { assertSameBranch } from '../../../../common/branch/branch-scope.util';
import { AuditService } from '../../../audit/audit.service';
import { CustomerAccountService } from '../../../customer-account/customer-account.service';
import { FiscalDocumentOrmEntity } from '../../../fiscal/documents/fiscal-document.orm-entity';
import { FiscalDocumentsService } from '../../../fiscal/documents/fiscal-documents.service';
import { StockMovementType } from '../../../inventory/domain/entities/stock-movement-type';
import {
  STOCK_MOVEMENT_RECORDER,
  type StockMovementRecorder,
} from '../../../inventory/domain/ports/stock-movement-recorder.port';
import type { Sale } from '../../domain/entities/sale.entity';
import {
  SaleNotCancellableError,
  SaleNotFoundError,
} from '../../domain/errors/sale.errors';
import {
  PRODUCT_PRICING_PORT,
  type ProductPricingPort,
} from '../../domain/ports/product-pricing.port';
import {
  SALE_REPOSITORY,
  type SaleRepository,
} from '../../domain/ports/sale.repository.port';
import { toCents, fromCents } from '../../domain/services/money';
import { PaymentMethod } from '../../domain/value-objects/payment-method';
import { SaleStatus } from '../../domain/value-objects/sale-status';

export interface CancelSaleInput {
  saleId: string;
  reason: string;
  userId: string;
  branchId: string;
}

@Injectable()
export class CancelSaleUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(SALE_REPOSITORY) private readonly saleRepo: SaleRepository,
    @Inject(STOCK_MOVEMENT_RECORDER)
    private readonly stockRecorder: StockMovementRecorder,
    @Inject(PRODUCT_PRICING_PORT) private readonly pricing: ProductPricingPort,
    private readonly accountService: CustomerAccountService,
    private readonly audit: AuditService,
    private readonly fiscalDocs: FiscalDocumentsService,
  ) {}

  async execute(input: CancelSaleInput): Promise<Sale> {
    const sale = await this.saleRepo.findById(input.saleId);
    if (!sale) throw new SaleNotFoundError(input.saleId);
    assertSameBranch(sale.branchId, input.branchId);
    if (sale.status !== SaleStatus.COMPLETED) {
      throw new SaleNotCancellableError(sale.id, sale.status);
    }

    return this.uow.run(async (ctx) => {
      const items = await this.saleRepo.findItemsForCancellation(ctx, sale.id);
      // Para líneas SIN snapshot histórico de receta (ventas viejas), caemos al
      // snapshot ACTUAL del producto. Las ventas nuevas tienen kitComponentsSnapshot.
      const legacyKitProductIds = items
        .filter((i) => !i.kitComponentsSnapshot && i.productId !== null)
        .map((i) => i.productId as string);
      const legacySnaps = legacyKitProductIds.length
        ? await this.pricing.findManyForSale(ctx, [...new Set(legacyKitProductIds)])
        : [];
      const legacySnapById = new Map(legacySnaps.map((s) => [s.id, s]));

      // Restaurar stock con movimientos CANCELLED_SALE (positivos).
      // Si el item era un kit, explotamos a componentes (preferimos snapshot
      // histórico; fallback a receta actual para ventas previas a la migración).
      for (const item of items) {
        // Ítem de monto libre: no tenía stock que revertir.
        if (item.productId === null) continue;
        const recipe = item.kitComponentsSnapshot
          ? item.kitComponentsSnapshot
          : legacySnapById.get(item.productId)?.isKit
          ? legacySnapById.get(item.productId)!.kitComponents
          : null;
        if (recipe) {
          for (const comp of recipe) {
            const totalQty = (
              parseFloat(comp.quantity) * parseFloat(item.quantity)
            ).toFixed(3);
            await this.stockRecorder.record(ctx, {
              productId: comp.componentProductId,
              type: StockMovementType.CANCELLED_SALE,
              quantity: totalQty,
              reason: `Cancelación venta ${sale.saleNumber} (kit ${item.productSkuSnapshot}): ${input.reason}`,
              saleId: sale.id,
              userId: input.userId,
              branchId: sale.branchId,
            });
          }
        } else {
          await this.stockRecorder.record(ctx, {
            productId: item.productId,
            variantId: item.variantId,
            type: StockMovementType.CANCELLED_SALE,
            quantity: item.quantity,
            reason: `Cancelación venta ${sale.saleNumber}: ${input.reason}`,
            saleId: sale.id,
            userId: input.userId,
            branchId: sale.branchId,
          });
        }
      }

      // Si la venta tenía pagos ACCOUNT, revertir el cargo al ledger del cliente.
      // Esto evita que la deuda quede colgando después de anular la venta.
      if (sale.customerId) {
        let accountCents = 0;
        for (const p of sale.payments) {
          if (p.method === PaymentMethod.ACCOUNT) accountCents += toCents(p.amount);
        }
        if (accountCents > 0) {
          await this.accountService.recordReversal(ctx, {
            customerId: sale.customerId,
            amount: fromCents(accountCents),
            saleId: sale.id,
            userId: input.userId,
          });
        }
      }

      const cancelled = await this.saleRepo.markCancelled(ctx, sale.id, {
        cancelledById: input.userId,
        cancelledAt: new Date(),
        cancelReason: input.reason,
      });

      // Si la venta tenía NCF emitido (factura), emitir nota de crédito que la
      // reverse. E3X → E34 (e-CF), B0X → B04 (tradicional). Esto es lo que se
      // envía a DGII para anular el comprobante original; el sistema externo
      // (provider) la recoge al detectarla en fiscal_documents.
      if (sale.fiscalDocument && sale.fiscalDocument.status === 'ISSUED') {
        const isElectronic = sale.fiscalDocument.docType.startsWith('E');
        const creditNoteCode = isElectronic ? 'E34' : 'B04';
        await this.fiscalDocs.issueForSale(ctx, {
          docTypeCode: creditNoteCode,
          saleId: sale.id,
          branchId: sale.branchId,
          buyerName: sale.fiscalDocument.buyerName,
          buyerRnc: sale.fiscalDocument.buyerRnc,
          subtotal: sale.subtotal,
          taxTotal: sale.taxTotal,
          total: sale.total,
          items: items.map((it) => ({
            description: it.variantNameSnapshot
              ? `${it.productNameSnapshot} · ${it.variantNameSnapshot}`
              : it.productNameSnapshot,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount,
            taxRate: it.taxRate,
            taxTotal: it.taxTotal,
            total: it.total,
          })),
        });
        // El factura original queda como CANCELLED para que DGII (vía provider)
        // pueda relacionar la nota de crédito con su NCF original.
        await ctx.manager.update(
          FiscalDocumentOrmEntity,
          { id: sale.fiscalDocument.id },
          { status: 'CANCELLED' },
        );
      }

      // Audit: fire-and-forget; falla no rompe la cancelación.
      void this.audit.record({
        actorUserId: input.userId,
        action: 'sales.cancel',
        entityType: 'sale',
        entityId: sale.id,
        payload: {
          saleNumber: sale.saleNumber,
          total: sale.total,
          customerId: sale.customerId,
          reason: input.reason,
        },
      });

      return cancelled;
    });
  }
}
