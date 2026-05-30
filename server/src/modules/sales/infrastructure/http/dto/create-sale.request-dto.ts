import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../../domain/value-objects/payment-method';

const MONEY = /^\d+(\.\d{1,2})?$/;
const QTY = /^\d+(\.\d{1,3})?$/;

export class CreateSaleItemDto {
  @IsUUID()
  productId!: string;

  @IsNumberString()
  @Matches(QTY, { message: 'quantity debe tener hasta 3 decimales' })
  quantity!: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'discount debe tener hasta 2 decimales' })
  discount?: string;
}

export class CreateSalePaymentDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsNumberString()
  @Matches(MONEY, { message: 'amount debe tener hasta 2 decimales' })
  amount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}

export class CreateSaleRequestDto {
  @IsUUID()
  cashSessionId!: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items!: CreateSaleItemDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSalePaymentDto)
  payments!: CreateSalePaymentDto[];
}
