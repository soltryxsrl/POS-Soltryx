import { IsOptional, IsString } from 'class-validator';
import { PaginationSortQuery } from '../../../common/dto/pagination-sort.query';

export class ListCustomersQuery extends PaginationSortQuery {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  isActive?: 'true' | 'false';
}
