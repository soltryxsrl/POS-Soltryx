import { IsEnum, IsNumberString, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PaymentMethod } from '../../sales/domain/value-objects/payment-method';

const MONEY = /^\d+(\.\d{1,2})?$/;

/**
 * Cómo se recibe el abono (cash, card, transfer, etc.).
 * NO incluye ACCOUNT — porque pagar crédito con crédito no tiene sentido.
 */
const ABONO_METHODS = [
  PaymentMethod.CASH,
  PaymentMethod.CARD,
  PaymentMethod.TRANSFER,
  PaymentMethod.OTHER,
] as const;

export class RegisterPaymentRequestDto {
  @IsNumberString()
  @Matches(MONEY, { message: 'amount debe tener hasta 2 decimales' })
  amount!: string;

  @IsEnum(ABONO_METHODS, {
    message: 'paymentMethod debe ser CASH, CARD, TRANSFER u OTHER',
  })
  paymentMethod!: (typeof ABONO_METHODS)[number];

  @IsOptional()
  @IsUUID()
  cashSessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
