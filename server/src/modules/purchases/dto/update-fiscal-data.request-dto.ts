import {
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const MONEY = /^\d+(\.\d{1,2})?$/;

/**
 * Edita SOLO los datos fiscales (comprobante DGII) de una orden de compra ya
 * existente, para que aparezca en el 606 sin tener que cancelarla y recrearla.
 * Mismas reglas que en `create`: si viene `supplierFiscalDocTypeCode`, entonces
 * `supplierNcf` y `supplierInvoiceDate` son obligatorios (lo valida el service);
 * dejar el tipo en blanco limpia el comprobante (la compra sale del 606).
 */
export class UpdateFiscalDataRequestDto {
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

  @IsOptional()
  @IsIn(['CASH', 'TRANSFER', 'CARD', 'CREDIT', 'OTHER'])
  paymentMethod?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'itbisRetenido debe tener hasta 2 decimales' })
  itbisRetenido?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'isrRetenido debe tener hasta 2 decimales' })
  isrRetenido?: string;

  @IsOptional()
  @IsIn(['01', '02', '03', '04', '05', '06', '07', '08'])
  isrRetentionType?: string;
}
