import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCashRegisterRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  /** Código opcional. Si se omite, el servidor genera CR-NNN automáticamente. */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'code solo admite letras, dígitos, guion y guion bajo',
  })
  @MaxLength(32)
  code?: string;
}
