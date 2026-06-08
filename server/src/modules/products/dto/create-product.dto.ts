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
} from 'class-validator';

const MONEY = /^\d+(\.\d{1,2})?$/;
const QTY = /^\d+(\.\d{1,3})?$/;
const TAX = /^\d+(\.\d{1,2})?$/;

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sku!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  // require_tld:false permite la URL del CDN propio en dev (http://localhost:9002/...);
  // en prod el dominio real con TLD también pasa.
  @IsUrl({ require_protocol: true, require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'costPrice debe tener hasta 2 decimales' })
  costPrice?: string;

  @IsNumberString()
  @Matches(MONEY, { message: 'salePrice debe tener hasta 2 decimales' })
  salePrice!: string;

  @IsOptional()
  @IsNumberString()
  @Matches(TAX, { message: 'taxRate debe tener hasta 2 decimales' })
  taxRate?: string;

  /**
   * Código del tipo de ITBIS (catálogo tax_types). Si se provee, el servidor
   * deriva `taxRate` de la tasa del tipo (ignora el taxRate enviado).
   */
  @IsOptional()
  @IsString()
  @MaxLength(16)
  taxTypeCode?: string;

  /**
   * Stock inicial opcional. Si se provee y > 0, se crea un stock_movement
   * de tipo PURCHASE y se actualiza products.stock — todo dentro de la
   * misma transacción que el insert del producto.
   */
  @IsOptional()
  @IsNumberString()
  @Matches(QTY, { message: 'initialStock debe tener hasta 3 decimales' })
  initialStock?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(QTY, { message: 'minStock debe tener hasta 3 decimales' })
  minStock?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(QTY, { message: 'maxStock debe tener hasta 3 decimales' })
  maxStock?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(QTY, { message: 'reorderPoint debe tener hasta 3 decimales' })
  reorderPoint?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Si true, este producto es un kit/combo y al venderlo se descuenta el stock de sus componentes. */
  @IsOptional()
  @IsBoolean()
  isKit?: boolean;

  /** Si true, se vende por peso (kg) — el POS muestra unidad y admite decimales. */
  @IsOptional()
  @IsBoolean()
  soldByWeight?: boolean;
}
