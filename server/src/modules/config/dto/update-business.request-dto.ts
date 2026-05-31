import {
  IsBoolean,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
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

  /**
   * Logo del negocio. Vacío = sin logo. Acepta una URL pública http(s) O un
   * data URI de imagen (`data:image/...;base64,...`) cuando se sube un archivo
   * desde el dispositivo. El límite alto cubre el base64 (la UI reescala antes).
   */
  @IsOptional()
  @IsString()
  @MaxLength(1_500_000)
  @ValidateIf((_, value) => value !== null && value !== '')
  @Matches(/^(https?:\/\/|data:image\/)/, {
    message: 'logoUrl debe ser una URL http(s) o un data URI de imagen',
  })
  logoUrl?: string | null;

  /** Eslogan corto del negocio. */
  @IsOptional()
  @IsString()
  @MaxLength(180)
  tagline?: string | null;
}
