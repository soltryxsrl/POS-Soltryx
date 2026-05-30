import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../../common/persistence/unit-of-work.port';
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
  SALE_REPOSITORY,
  type SaleRepository,
} from '../../domain/ports/sale.repository.port';
import { SaleStatus } from '../../domain/value-objects/sale-status';

export interface CancelSaleInput {
  saleId: string;
  reason: string;
  userId: string;
}

@Injectable()
export class CancelSaleUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(SALE_REPOSITORY) private readonly saleRepo: SaleRepository,
    @Inject(STOCK_MOVEMENT_RECORDER)
    private readonly stockRecorder: StockMovementRecorder,
  ) {}

  async execute(input: CancelSaleInput): Promise<Sale> {
    const sale = await this.saleRepo.findById(input.saleId);
    if (!sale) throw new SaleNotFoundError(input.saleId);
    if (sale.status !== SaleStatus.COMPLETED) {
      throw new SaleNotCancellableError(sale.id, sale.status);
    }

    return this.uow.run(async (ctx) => {
      const items = await this.saleRepo.findItemsForCancellation(ctx, sale.id);

      // Restaurar stock con movimientos CANCELLED_SALE (positivos)
      for (const item of items) {
        await this.stockRecorder.record(ctx, {
          productId: item.productId,
          type: StockMovementType.CANCELLED_SALE,
          quantity: item.quantity,
          reason: `Cancelación venta ${sale.saleNumber}: ${input.reason}`,
          saleId: sale.id,
          userId: input.userId,
          branchId: sale.branchId,
        });
      }

      const cancelled = await this.saleRepo.markCancelled(ctx, sale.id, {
        cancelledById: input.userId,
        cancelledAt: new Date(),
        cancelReason: input.reason,
      });
      return cancelled;
    });
  }
}
