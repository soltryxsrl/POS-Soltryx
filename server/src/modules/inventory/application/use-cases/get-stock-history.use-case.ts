import { Inject, Injectable } from '@nestjs/common';
import {
  STOCK_MOVEMENT_REPOSITORY,
  type StockMovementRepository,
} from '../../domain/ports/stock-movement.repository.port';
import type { StockMovement } from '../../domain/entities/stock-movement.entity';

export interface GetStockHistoryInput {
  productId?: string;
  limit?: number;
  offset?: number;
}

export interface GetStockHistoryOutput {
  items: StockMovement[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class GetStockHistoryUseCase {
  constructor(
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly repo: StockMovementRepository,
  ) {}

  async execute(input: GetStockHistoryInput): Promise<GetStockHistoryOutput> {
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    const { items, total } = await this.repo.list({
      productId: input.productId,
      limit,
      offset,
    });
    return { items, total, limit, offset };
  }
}
