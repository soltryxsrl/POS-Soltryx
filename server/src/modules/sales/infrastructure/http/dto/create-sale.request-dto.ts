import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../../domain/value-objects/payment-method';

const MONEY = /^\d+(\.\d{1,2})?$/;
const QTY = /^\d+(\.\d{1,3})?$/;

export class CreateSaleItemDto {
  /** Catálogo: id del producto. Se OMITE en ítems de "monto libre". */
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  /** Monto libre: descripción que se imprime como nombre de la línea. */
  @IsOptional()
  @IsString()
  @MaxLength(180)
  description?: string;

  /** Monto libre: precio unitario tecleado por el cajero. */
  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'unitPrice debe tener hasta 2 decimales' })
  unitPrice?: string;

  /** Monto libre: tasa de ITBIS (0 = exento, 18 = gravado). Default 0. */
  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'taxRate debe tener hasta 2 decimales' })
  taxRate?: string;

  @IsNumberString()
  @Matches(QTY, { message: 'quantity debe tener hasta 3 decimales' })
  quantity!: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'discount debe tener hasta 2 decimales' })
  discount?: string;

  /** Nota libre por línea (modificador, instrucción). Máx 200 caracteres. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class CreateSalePaymentDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  /**
   * Si `currencyCode` se omite o es 'DOP', `amount` es el monto final en DOP.
   * Si `currencyCode` es una moneda extranjera (USD, EUR), `amount` es el
   * monto en ESA moneda — el server convierte usando la tasa actual.
   */
  @IsNumberString()
  @Matches(MONEY, { message: 'amount debe tener hasta 2 decimales' })
  amount!: string;

  /** Código ISO 4217. Default 'DOP'. */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currencyCode debe ser un código ISO 4217 (3 letras)' })
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}

export class DiscountOverrideCredentialsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  emailOrUsername!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;
}

export class CreateSaleRequestDto {
  @IsUUID()
  cashSessionId!: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  /**
   * Código DGII del tipo de comprobante fiscal (B01/B02/E31/E32/etc.). Si se
   * omite, la venta se emite como "Recibo no fiscal" (NOT_REQUIRED). Si se
   * incluye, el server llama `getNextNCF()` y crea un fiscal_documents.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]\d{2}$/, {
    message: 'fiscalDocTypeCode debe ser el código DGII (ej. E31, B02)',
  })
  fiscalDocTypeCode?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'orderDiscount debe tener hasta 2 decimales' })
  orderDiscount?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'tipTotal debe tener hasta 2 decimales' })
  tipTotal?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items!: CreateSaleItemDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSalePaymentDto)
  payments!: CreateSalePaymentDto[];

  /**
   * Credenciales de un manager (con permiso `sales.discount.override`) cuando
   * el descuento aplicado supera el umbral configurado. Solo necesario si el
   * cajero NO tiene el permiso por sí mismo.
   */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DiscountOverrideCredentialsDto)
  overrideCredentials?: DiscountOverrideCredentialsDto;
}
