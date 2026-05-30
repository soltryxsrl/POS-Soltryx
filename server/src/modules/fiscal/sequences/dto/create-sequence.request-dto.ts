import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class CreateFiscalSequenceRequestDto {
  /** Código DGII del tipo (E31, E32, etc.) */
  @IsString()
  @Matches(/^E\d{2}$/, { message: 'docType debe ser un código E## válido (ej: E31)' })
  docType!: string;

  /** Prefijo del NCF: típicamente coincide con docType ("E32") o legacy "B02". */
  @IsString()
  @Length(1, 8)
  prefix!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  rangeFrom!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  rangeTo!: number;

  /** Fecha de vencimiento del rango (opcional pero recomendada). */
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
