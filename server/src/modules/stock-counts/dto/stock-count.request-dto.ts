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

export class CreateStockCountRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class StockCountItemDto {
  @IsUUID()
  productId!: string;

  @IsString()
  @Matches(QTY, { message: 'countedQty debe ser >= 0 con hasta 3 decimales' })
  countedQty!: string;
}

export class SetStockCountItemsRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockCountItemDto)
  items!: StockCountItemDto[];
}
