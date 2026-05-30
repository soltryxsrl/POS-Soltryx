import { Inject, Injectable } from '@nestjs/common';
import {
  SALE_REPOSITORY,
  type ListSalesFilter,
  type ListSalesResult,
  type SaleRepository,
} from '../../domain/ports/sale.repository.port';

@Injectable()
export class ListSalesUseCase {
  constructor(@Inject(SALE_REPOSITORY) private readonly saleRepo: SaleRepository) {}

  execute(filter: ListSalesFilter): Promise<ListSalesResult> {
    return this.saleRepo.list(filter);
  }
}
