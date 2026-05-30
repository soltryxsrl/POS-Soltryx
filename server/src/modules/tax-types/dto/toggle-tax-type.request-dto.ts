import { IsBoolean } from 'class-validator';

export class ToggleTaxTypeRequestDto {
  @IsBoolean()
  isActive!: boolean;
}
