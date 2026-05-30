import { IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const MONEY = /^\d+(\.\d{1,2})?$/;

export class CloseCashSessionRequestDto {
  @IsString()
  @Matches(MONEY, { message: 'countedAmount debe tener hasta 2 decimales' })
  countedAmount!: string;

  /** Conteo por denominación al cierre. Opcional; si llega, debe sumar countedAmount. */
  @IsOptional()
  @IsObject()
  closingDenominations?: Record<string, number>;

  /**
   * Monto declarado por el cajero por método de pago. Solo se valida que sea
   * un objeto. Ej: `{ "CASH": "500.00", "CARD": "300.00" }`. Si se omite, el
   * sistema asume declared = lo que registró el POS (sin diferencia).
   */
  @IsOptional()
  @IsObject()
  closingDeclaredByMethod?: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
