import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

/**
 * "Renovar" = desactiva la secuencia actual de ese (docType, prefix) y crea
 * una nueva con el rango siguiente. Esto deja trail completo para auditoría
 * sin pisar nada del histórico.
 */
export class RenewFiscalSequenceRequestDto {
  /** Si no se provee, se reutiliza el prefix del rango activo previo. */
  @IsOptional()
  @IsString()
  @Length(1, 8)
  prefix?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  rangeFrom!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  rangeTo!: number;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
