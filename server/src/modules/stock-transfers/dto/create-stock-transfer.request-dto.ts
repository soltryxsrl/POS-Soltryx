import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const QTY = /^\d+(\.\d{1,3})?$/;

export class CreateStockTransferItemDto {
  /** Producto en la sucursal ORIGEN (la activa). */
  @IsUUID()
  productId!: string;

  @IsString()
  @Matches(QTY, { message: 'quantity debe tener hasta 3 decimales' })
  quantity!: string;
}

export class CreateStockTransferRequestDto {
  /** Sucursal DESTINO (distinta de la activa). */
  @IsUUID()
  destBranchId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStockTransferItemDto)
  items!: CreateStockTransferItemDto[];
}
