import {
  IsBoolean,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const MONEY = /^\d+(\.\d{1,2})?$/;
const QTY = /^\d+(\.\d{1,3})?$/;

/**
 * El stock NO se actualiza por aquí. Para mover stock usar el endpoint del
 * módulo Inventory (`POST /inventory/adjust`).
 */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY)
  costPrice?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY)
  salePrice?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY)
  taxRate?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(QTY)
  minStock?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
