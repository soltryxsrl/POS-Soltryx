import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

const MONEY = /^\d+(\.\d{1,2})?$/;

export class OpenCashSessionRequestDto {
  @IsUUID()
  cashRegisterId!: string;

  @IsString()
  @Matches(MONEY, { message: 'openingAmount debe tener hasta 2 decimales' })
  openingAmount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
