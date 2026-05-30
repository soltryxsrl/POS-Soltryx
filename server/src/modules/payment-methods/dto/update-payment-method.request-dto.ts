import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePaymentMethodRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsBoolean()
  requiresReference?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
