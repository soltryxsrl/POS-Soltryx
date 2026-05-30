import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const MONEY = /^\d+(\.\d{1,2})?$/;

export class CloseCashSessionRequestDto {
  @IsString()
  @Matches(MONEY, { message: 'countedAmount debe tener hasta 2 decimales' })
  countedAmount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
