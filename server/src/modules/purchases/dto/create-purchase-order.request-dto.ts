import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const MONEY = /^\d+(\.\d{1,2})?$/;
const QTY = /^\d+(\.\d{1,3})?$/;
const TAX = /^\d+(\.\d{1,2})?$/;

export class CreatePurchaseOrderItemDto {
  @IsUUID()
  productId!: string;

  @IsNumberString()
  @Matches(QTY, { message: 'orderedQuantity inválida' })
  orderedQuantity!: string;

  @IsNumberString()
  @Matches(MONEY, { message: 'unitCost inválido' })
  unitCost!: string;

  /** Opcional — si se omite, se usa el taxRate snapshot del producto. */
  @IsOptional()
  @IsNumberString()
  @Matches(TAX, { message: 'taxRate inválido' })
  taxRate?: string;
}

export class CreatePurchaseOrderRequestDto {
  @IsUUID()
  supplierId!: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  supplierInvoice?: string;

  /**
   * Datos fiscales del proveedor — opcionales. Si se incluye el código del
   * tipo de comprobante, entonces `supplierNcf` y `supplierInvoiceDate` son
   * obligatorios (el service lo valida). Estos datos se usan para el 606.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]\d{2}$/, {
    message: 'supplierFiscalDocTypeCode debe ser el código DGII (ej. B01, E41)',
  })
  supplierFiscalDocTypeCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  supplierNcf?: string;

  @IsOptional()
  @IsDateString()
  supplierInvoiceDate?: string;

  /** Forma de pago al proveedor (para la columna "Forma de Pago" del 606). */
  @IsOptional()
  @IsIn(['CASH', 'TRANSFER', 'CARD', 'CREDIT', 'OTHER'])
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items!: CreatePurchaseOrderItemDto[];
}
