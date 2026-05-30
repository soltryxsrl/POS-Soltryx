import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationSortQuery } from '../../../common/dto/pagination-sort.query';

export class ListPurchaseOrdersQuery extends PaginationSortQuery {
  /** Búsqueda por número de orden. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsIn(['PENDING', 'PARTIAL', 'RECEIVED', 'CANCELLED'])
  status?: 'PENDING' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
