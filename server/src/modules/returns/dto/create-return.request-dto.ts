import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const QTY = /^\d+(\.\d{1,3})?$/;
const REFUND_METHODS = [
  'CASH',
  'CARD',
  'TRANSFER',
  'STORE_CREDIT',
  'ACCOUNT',
  'OTHER',
] as const;

export class ReturnItemDto {
  @IsUUID()
  saleItemId!: string;

  @IsNumberString()
  @Matches(QTY, { message: 'quantity inválida' })
  quantity!: string;
}

export class CreateReturnRequestDto {
  @IsUUID()
  saleId!: string;

  @IsIn(REFUND_METHODS)
  refundMethod!: (typeof REFUND_METHODS)[number];

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];
}
