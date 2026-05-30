import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AddBarcodeRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  barcode!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
