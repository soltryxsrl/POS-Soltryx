import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const MONEY = /^\d+(\.\d{1,2})?$/;
const QTY = /^\d+(\.\d{1,3})?$/;
const TAX = /^\d+(\.\d{1,2})?$/;

export class StandaloneDocItemDto {
  @IsString()
  @MaxLength(255)
  description!: string;

  @IsNumberString()
  @Matches(QTY, { message: 'quantity inválida' })
  quantity!: string;

  @IsNumberString()
  @Matches(MONEY, { message: 'unitPrice inválido' })
  unitPrice!: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'discount inválido' })
  discount?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(TAX, { message: 'taxRate inválido' })
  taxRate?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'taxTotal inválido' })
  taxTotal?: string;

  @IsNumberString()
  @Matches(MONEY, { message: 'total inválido' })
  total!: string;
}

export class IssueStandaloneDocumentRequestDto {
  /** Código DGII: E41, E43, B11 o B13. */
  @IsString()
  @Matches(/^(E41|E43|B11|B13)$/, {
    message:
      'docTypeCode debe ser uno de: E41, E43, B11, B13 (compras informales / gastos menores)',
  })
  docTypeCode!: string;

  /** Nombre del proveedor informal o concepto del gasto. */
  @IsOptional()
  @IsString()
  @MaxLength(180)
  counterpartyName?: string;

  /** RNC/Cédula del proveedor informal (si se conoce). */
  @IsOptional()
  @IsString()
  @MaxLength(16)
  counterpartyRnc?: string;

  @IsNumberString()
  @Matches(MONEY, { message: 'subtotal inválido' })
  subtotal!: string;

  @IsOptional()
  @IsNumberString()
  @Matches(MONEY, { message: 'taxTotal inválido' })
  taxTotal?: string;

  @IsNumberString()
  @Matches(MONEY, { message: 'total inválido' })
  total!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StandaloneDocItemDto)
  items?: StandaloneDocItemDto[];
}
