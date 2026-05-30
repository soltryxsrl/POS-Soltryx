import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumberString,
  IsOptional,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';

const QTY = /^\d+(\.\d{1,3})?$/;

export class ReceivePurchaseOrderItemDto {
  @IsUUID()
  itemId!: string;

  /** Cantidad recibida AHORA (no acumulada). Puede ser 0 si esta línea no llegó esta vez. */
  @IsNumberString()
  @Matches(QTY, { message: 'quantity inválida' })
  quantity!: string;
}

export class ReceivePurchaseOrderRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderItemDto)
  items!: ReceivePurchaseOrderItemDto[];

  /** Si true (default), actualiza `products.cost_price` al unit_cost recibido. */
  @IsOptional()
  @IsBoolean()
  updateProductCost?: boolean;
}
