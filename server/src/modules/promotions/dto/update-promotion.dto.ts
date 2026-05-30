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
import { PROMO_TYPES, type PromotionTypeCode } from './create-promotion.dto';

const MONEY = /^\d+(\.\d{1,2})?$/;
const PCT = /^\d+(\.\d{1,2})?$/;

export class UpdatePromotionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(PROMO_TYPES)
  type?: PromotionTypeCode;

  @IsOptional()
  @IsUUID()
  productId?: string | null;

  @IsOptional()
  @IsUUID()
  variantId?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsNumberString()
  @Matches(PCT)
  percentOff?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY)
  amountOff?: string;

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

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY)
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
