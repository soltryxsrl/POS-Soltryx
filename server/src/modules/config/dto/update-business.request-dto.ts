import {
  IsBoolean,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * Todos los campos básicos requeridos: la UI envía el snapshot completo en cada save.
 * Vacíos se permiten (string longitud 0) — semánticamente "sin valor".
 */
export class UpdateBusinessRequestDto {
  @IsString()
  @MaxLength(180)
  name!: string;

  @IsString()
  @MaxLength(180)
  legalName!: string;

  @IsString()
  @MaxLength(32)
  rnc!: string;

  @IsString()
  @MaxLength(255)
  address!: string;

  @IsString()
  @MaxLength(64)
  phone!: string;

  @IsString()
  @MaxLength(255)
  footerNote!: string;

  /** Política de stock negativo. Opcional para no romper clientes viejos. */
  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  /** Si true, los precios de venta ya incluyen ITBIS (se back-calcula). */
  @IsOptional()
  @IsBoolean()
  priceIncludesTax?: boolean;

  /** Activa propina al cobrar en POS. */
  @IsOptional()
  @IsBoolean()
  tipEnabled?: boolean;

  /** Porcentaje sugerido (ej: "10.00"). */
  @IsOptional()
  @IsString()
  tipDefaultPct?: string;

  /** Régimen tributario: ORDINARIO declara 606/607; RST no. */
  @IsOptional()
  @IsIn(['ORDINARIO', 'RST'])
  taxRegime?: 'ORDINARIO' | 'RST';

  /** % de descuento sobre el subtotal a partir del cual se requiere
   *  autorización de un manager. Default 15.00. */
  @IsOptional()
  @IsNumberString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'discountOverrideThresholdPct debe ser un número con hasta 2 decimales',
  })
  discountOverrideThresholdPct?: string;

  /** URL pública del logo del negocio. Vacío = sin logo. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  logoUrl?: string | null;

  /** Eslogan corto del negocio. */
  @IsOptional()
  @IsString()
  @MaxLength(180)
  tagline?: string | null;
}
