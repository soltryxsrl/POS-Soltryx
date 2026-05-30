import { IsBoolean } from 'class-validator';

export class ToggleFiscalDocTypeRequestDto {
  @IsBoolean()
  isActive!: boolean;
}
