import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationSortQuery } from '../../../common/dto/pagination-sort.query';

export type PromotionStatusFilter = 'active' | 'scheduled' | 'expired' | 'inactive';

export class ListPromotionsQuery extends PaginationSortQuery {
  /** Búsqueda por nombre. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  isActive?: boolean;

  /**
   * Estado computado contra la fecha actual:
   * - active: isActive=true y dentro del rango validFrom..validUntil
   * - scheduled: isActive=true y validFrom es futuro
   * - expired: validUntil pasado
   * - inactive: isActive=false
   */
  @IsOptional()
  @IsIn(['active', 'scheduled', 'expired', 'inactive'])
  status?: PromotionStatusFilter;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
