import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const MONEY = /^\d+(\.\d{1,2})?$/;
const RATE = /^\d+(\.\d{1,2})?$/;

export class ParkedCartItemDto {
  /** Null en ítems de "monto libre" (sin producto del catálogo). */
  @ValidateIf((o) => o.productId !== null && o.productId !== undefined)
  @IsUUID()
  productId!: string | null;

  @IsOptional()
  @IsUUID()
  variantId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  variantName?: string | null;

  @IsString()
  @MaxLength(180)
  productName!: string;

  @IsString()
  @MaxLength(64)
  sku!: string;

  @IsNumberString()
  @Matches(MONEY, { message: 'unitPrice inválido' })
  unitPrice!: string;

  @IsNumberString()
  @Matches(RATE, { message: 'taxRate inválido' })
  taxRate!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsNumberString()
  @Matches(MONEY, { message: 'discount inválido' })
  discount!: string;

  /** Nota libre por línea — opcional. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string | null;
}

export class ParkedCartPayloadDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ParkedCartItemDto)
  items!: ParkedCartItemDto[];

  @IsNumberString()
  @Matches(MONEY, { message: 'orderDiscount inválido' })
  orderDiscount!: string;
}

export class CreateParkedCartRequestDto {
  @IsUUID()
  cashSessionId!: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ParkedCartPayloadDto)
  payload!: ParkedCartPayloadDto;
}
