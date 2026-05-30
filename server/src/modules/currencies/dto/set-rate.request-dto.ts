import { IsNumberString, Matches } from 'class-validator';

export class SetExchangeRateRequestDto {
  @IsNumberString()
  @Matches(/^\d+(\.\d{1,6})?$/, { message: 'rate debe tener hasta 6 decimales' })
  rate!: string;
}
