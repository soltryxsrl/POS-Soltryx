import { IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

const SIGNED_QTY = /^-?\d+(\.\d{1,3})?$/;

export class AdjustStockRequestDto {
  @IsUUID()
  productId!: string;

  /** Si se ajusta una variante específica, su id. */
  @IsOptional()
  @IsUUID()
  variantId?: string;

  /** Signada: "+5", "5", "-3", "0.500", "-1.250" */
  @IsString()
  @Matches(SIGNED_QTY, { message: 'quantity debe ser un decimal con signo opcional' })
  quantity!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason!: string;
}
