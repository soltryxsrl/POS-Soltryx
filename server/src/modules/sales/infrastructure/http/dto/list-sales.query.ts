import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationSortQuery } from '../../../../../common/dto/pagination-sort.query';
import { PaymentMethod } from '../../../domain/value-objects/payment-method';
import { SaleStatus } from '../../../domain/value-objects/sale-status';

export class ListSalesQuery extends PaginationSortQuery {
  /** Búsqueda por número de venta/recibo. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;

  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsUUID()
  cashSessionId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
