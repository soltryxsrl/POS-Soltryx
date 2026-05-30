import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationSortQuery } from '../../../common/dto/pagination-sort.query';

export type ProductTypeFilter = 'simple' | 'kit' | 'variant';

export class ListProductsQuery extends PaginationSortQuery {
  /** Busca en name, sku, barcode (case-insensitive). */
  @IsOptional()
  @IsString()
  @MaxLength(180)
  q?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  isActive?: boolean;

  /** Solo productos en/bajo nivel mínimo de stock. */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  lowStock?: boolean;

  /**
   * Tipo de producto:
   * - simple: no es kit y no tiene variantes
   * - kit: es kit (isKit = true)
   * - variant: tiene variantes (hasVariants = true)
   */
  @IsOptional()
  @IsIn(['simple', 'kit', 'variant'])
  type?: ProductTypeFilter;
}
