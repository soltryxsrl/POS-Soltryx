import { IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

const MONEY = /^\d+(\.\d{1,2})?$/;

export class OpenCashSessionRequestDto {
  @IsUUID()
  cashRegisterId!: string;

  @IsString()
  @Matches(MONEY, { message: 'openingAmount debe tener hasta 2 decimales' })
  openingAmount!: string;

  /**
   * Conteo opcional por denominación. Si se envía, el server valida que
   * sumen exactamente `openingAmount`. Si no, se permite abrir solo con total.
   * Formato: { "2000": 0, "1000": 5, ... } (clave = valor en pesos).
   */
  @IsOptional()
  @IsObject()
  openingDenominations?: Record<string, number>;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
