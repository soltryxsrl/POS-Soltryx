import { Inject, Injectable } from '@nestjs/common';
import type { Sale } from '../../domain/entities/sale.entity';
import { SaleNotFoundError } from '../../domain/errors/sale.errors';
import {
  SALE_REPOSITORY,
  type SaleRepository,
} from '../../domain/ports/sale.repository.port';

@Injectable()
export class GetSaleUseCase {
  constructor(@Inject(SALE_REPOSITORY) private readonly saleRepo: SaleRepository) {}

  async execute(id: string): Promise<Sale> {
    const sale = await this.saleRepo.findById(id);
    if (!sale) throw new SaleNotFoundError(id);
    return sale;
  }
}
