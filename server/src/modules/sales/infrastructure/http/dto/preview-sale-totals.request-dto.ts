import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const MONEY = /^\d+(\.\d{1,2})?$/;
const QTY = /^\d+(\.\d{1,3})?$/;

export class PreviewSaleTotalsItemDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  /** Monto libre: descripción de la línea (sin producto del catálogo). */
  @IsOptional()
  @IsString()
  @MaxLength(180)
  description?: string;

  /** Monto libre: precio unitario tecleado por el cajero. */
  @IsOptional()
  @IsNumberString()
  @Matches(MONEY)
  unitPrice?: string;

  /** Monto libre: tasa de ITBIS (default 0). */
  @IsOptional()
  @IsNumberString()
  @Matches(MONEY)
  taxRate?: string;

  @IsNumberString()
  @Matches(QTY)
  quantity!: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY)
  discount?: string;
}

export class PreviewSaleTotalsRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PreviewSaleTotalsItemDto)
  items!: PreviewSaleTotalsItemDto[];

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY)
  orderDiscount?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY)
  tipTotal?: string;
}
