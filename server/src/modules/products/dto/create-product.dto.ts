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
const TAX = /^\d+(\.\d{1,2})?$/;

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
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
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'costPrice debe tener hasta 2 decimales' })
  costPrice?: string;

  @IsNumberString()
  @Matches(MONEY, { message: 'salePrice debe tener hasta 2 decimales' })
  salePrice!: string;

  @IsOptional()
  @IsNumberString()
  @Matches(TAX, { message: 'taxRate debe tener hasta 2 decimales' })
  taxRate?: string;

  /**
   * Stock inicial opcional. Si se provee y > 0, se crea un stock_movement
   * de tipo PURCHASE y se actualiza products.stock — todo dentro de la
   * misma transacción que el insert del producto.
   */
  @IsOptional()
  @IsNumberString()
  @Matches(QTY, { message: 'initialStock debe tener hasta 3 decimales' })
  initialStock?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(QTY, { message: 'minStock debe tener hasta 3 decimales' })
  minStock?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
