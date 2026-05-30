import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationSortQuery } from '../../../common/dto/pagination-sort.query';
import { RefundMethod } from '../sale-return.orm-entity';

export class ListReturnsQuery extends PaginationSortQuery {
  /** Búsqueda por número de devolución. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;

  @IsOptional()
  @IsUUID()
  saleId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(RefundMethod)
  refundMethod?: RefundMethod;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
