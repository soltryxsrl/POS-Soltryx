import {
  IsBoolean,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const MONEY = /^\d+(\.\d{1,2})?$/;
const QTY = /^\d+(\.\d{1,3})?$/;

export class UpdateVariantDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
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
  @IsNumberString()
  @Matches(MONEY)
  salePrice?: string | null;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY)
  costPrice?: string | null;

  @IsOptional()
  @IsNumberString()
  @Matches(QTY)
  minStock?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
