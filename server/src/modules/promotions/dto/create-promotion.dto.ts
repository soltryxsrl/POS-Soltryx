import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const PROMO_TYPES = [
  'PRODUCT_PERCENT_OFF',
  'PRODUCT_AMOUNT_OFF',
  'PRODUCT_BUY_X_GET_Y',
  'ORDER_PERCENT_OFF',
  'ORDER_AMOUNT_OFF',
] as const;
export type PromotionTypeCode = (typeof PROMO_TYPES)[number];

const MONEY = /^\d+(\.\d{1,2})?$/;
const PCT = /^\d+(\.\d{1,2})?$/;

export class CreatePromotionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(PROMO_TYPES)
  type!: PromotionTypeCode;

  @IsOptional()
  @IsUUID()
  productId?: string;

  /** Si se setea, la promo aplica SOLO a esta variante. Debe coincidir con productId. */
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /** % off, ej "10.00". Requerido para *_PERCENT_OFF. */
  @IsOptional()
  @IsNumberString()
  @Matches(PCT, { message: 'percentOff debe ser un número con hasta 2 decimales' })
  percentOff?: string;

  /** Monto off RD$. Requerido para *_AMOUNT_OFF. */
  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'amountOff debe ser un número con hasta 2 decimales' })
  amountOff?: string;

  /** Para BUY_X_GET_Y: total a comprar. Ej minQuantity=2 + freeQuantity=1 = "2x1". */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  minQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  freeQuantity?: number;

  /** Para ORDER_*: total mínimo de la orden para aplicar. */
  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'minOrderTotal debe ser un número con hasta 2 decimales' })
  minOrderTotal?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;
}
