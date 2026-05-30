import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationSortQuery } from '../../../../../common/dto/pagination-sort.query';
import { StockMovementType } from '../../../domain/entities/stock-movement-type';

export class ListMovementsQuery extends PaginationSortQuery {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsEnum(StockMovementType)
  type?: StockMovementType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
