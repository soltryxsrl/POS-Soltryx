import { Inject, Injectable } from '@nestjs/common';
import { assertSameBranch } from '../../../../common/branch/branch-scope.util';
import type { Sale } from '../../domain/entities/sale.entity';
import { SaleNotFoundError } from '../../domain/errors/sale.errors';
import {
  SALE_REPOSITORY,
  type SaleRepository,
} from '../../domain/ports/sale.repository.port';

@Injectable()
export class GetSaleUseCase {
  constructor(@Inject(SALE_REPOSITORY) private readonly saleRepo: SaleRepository) {}

  async execute(id: string, branchId: string): Promise<Sale> {
    const sale = await this.saleRepo.findById(id);
    if (!sale) throw new SaleNotFoundError(id);
    assertSameBranch(sale.branchId, branchId);
    return sale;
  }
}
