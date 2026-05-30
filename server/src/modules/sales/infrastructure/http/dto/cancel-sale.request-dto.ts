import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelSaleRequestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason!: string;
}
