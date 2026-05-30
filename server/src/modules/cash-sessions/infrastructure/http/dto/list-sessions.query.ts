import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationSortQuery } from '../../../../../common/dto/pagination-sort.query';
import { CashSessionStatus } from '../../../domain/value-objects/cash-session-status';

export class ListSessionsQuery extends PaginationSortQuery {
  @IsOptional()
  @IsEnum(CashSessionStatus)
  status?: CashSessionStatus;

  @IsOptional()
  @IsUUID()
  cashRegisterId?: string;

  @IsOptional()
  @IsUUID()
  openedById?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
