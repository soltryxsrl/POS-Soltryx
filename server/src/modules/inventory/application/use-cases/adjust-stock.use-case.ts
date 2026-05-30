import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../../common/persistence/unit-of-work.port';
import {
  STOCK_MOVEMENT_RECORDER,
  type StockMovementRecorder,
} from '../../domain/ports/stock-movement-recorder.port';
import { StockMovementType } from '../../domain/entities/stock-movement-type';
import type { StockMovement } from '../../domain/entities/stock-movement.entity';

export interface AdjustStockInput {
  productId: string;
  /** Cantidad signada: "+5" entra, "-3" sale. */
  quantity: string;
  reason: string;
  userId: string;
}

@Injectable()
export class AdjustStockUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(STOCK_MOVEMENT_RECORDER) private readonly recorder: StockMovementRecorder,
  ) {}

  execute(input: AdjustStockInput): Promise<StockMovement> {
    return this.uow.run(async (ctx) =>
      this.recorder.record(ctx, {
        productId: input.productId,
        type: StockMovementType.ADJUSTMENT,
        quantity: input.quantity,
        reason: input.reason,
        userId: input.userId,
      }),
    );
  }
}
