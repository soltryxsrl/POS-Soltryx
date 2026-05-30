import { IsBoolean } from 'class-validator';

export class ToggleCurrencyRequestDto {
  @IsBoolean()
  isActive!: boolean;
}
