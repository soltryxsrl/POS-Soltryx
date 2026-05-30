import { Inject, Injectable } from '@nestjs/common';
import type { StockMovementType } from '../../domain/entities/stock-movement-type';
import {
  STOCK_MOVEMENT_REPOSITORY,
  type StockMovementRepository,
} from '../../domain/ports/stock-movement.repository.port';
import type { StockMovement } from '../../domain/entities/stock-movement.entity';

export interface GetStockHistoryInput {
  productId?: string;
  type?: StockMovementType;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
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
      type: input.type,
      from: input.from,
      to: input.to,
      limit,
      offset,
      sort: input.sort,
      sortDir: input.sortDir,
    });
    return { items, total, limit, offset };
  }
}
