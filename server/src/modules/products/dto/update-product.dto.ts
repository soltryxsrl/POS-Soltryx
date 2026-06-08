import {
  IsBoolean,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

const MONEY = /^\d+(\.\d{1,2})?$/;
const QTY = /^\d+(\.\d{1,3})?$/;

/**
 * El stock NO se actualiza por aquí. Para mover stock usar el endpoint del
 * módulo Inventory (`POST /inventory/adjust`).
 */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ValidateIf((_, value) => value !== null && value !== '')
  // require_tld:false permite la URL del CDN propio en dev (http://localhost:9002/...).
  @IsUrl({ require_protocol: true, require_tld: false, protocols: ['http', 'https'] })
  imageUrl?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY)
  costPrice?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY)
  salePrice?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY)
  taxRate?: string;

  /**
   * Código del tipo de ITBIS (catálogo tax_types). Si se provee, el servidor
   * deriva `taxRate` de la tasa del tipo.
   */
  @IsOptional()
  @IsString()
  @MaxLength(16)
  taxTypeCode?: string | null;

  @IsOptional()
  @IsNumberString()
  @Matches(QTY)
  minStock?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(QTY)
  maxStock?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(QTY)
  reorderPoint?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isKit?: boolean;

  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @IsOptional()
  @IsBoolean()
  soldByWeight?: boolean;
}
