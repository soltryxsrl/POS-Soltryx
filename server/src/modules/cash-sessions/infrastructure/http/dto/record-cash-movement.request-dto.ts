import { IsEnum, IsNumberString, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { CashMovementType } from '../../../domain/value-objects/cash-movement-type';

const MONEY = /^\d+(\.\d{1,2})?$/;

export class RecordCashMovementRequestDto {
  @IsEnum(CashMovementType)
  type!: CashMovementType;

  @IsNumberString()
  @Matches(MONEY, { message: 'amount debe tener hasta 2 decimales' })
  amount!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason!: string;
}
