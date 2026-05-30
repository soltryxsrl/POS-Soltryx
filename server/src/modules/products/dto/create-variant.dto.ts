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

export class CreateVariantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sku!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'salePrice debe tener hasta 2 decimales' })
  salePrice?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'costPrice debe tener hasta 2 decimales' })
  costPrice?: string;

  /** Stock inicial. Si > 0 se registra un movimiento PURCHASE de variante. */
  @IsOptional()
  @IsNumberString()
  @Matches(QTY, { message: 'initialStock debe tener hasta 3 decimales' })
  initialStock?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(QTY)
  minStock?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
