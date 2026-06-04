import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumberString,
  IsOptional,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';

const MONEY = /^\d+(\.\d{1,2})?$/;
const QTY = /^\d+(\.\d{1,3})?$/;

/** A qué productos aplica una operación masiva (siempre acotado a la sucursal activa). */
class BulkTargetDto {
  /** 'all' = todos los de la sucursal · 'category' = una categoría · 'ids' = lista explícita. */
  @IsIn(['all', 'category', 'ids'])
  scope!: 'all' | 'category' | 'ids';

  @ValidateIf((o) => o.scope === 'category')
  @IsUUID()
  categoryId?: string;

  @ValidateIf((o) => o.scope === 'ids')
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  productIds?: string[];
}

export class BulkPriceUpdateDto extends BulkTargetDto {
  /** Qué precio cambiar. */
  @IsIn(['salePrice', 'costPrice'])
  field!: 'salePrice' | 'costPrice';

  /** Operación: fijar, o subir/bajar por porcentaje o monto. */
  @IsIn(['set', 'increasePct', 'decreasePct', 'increaseAmount', 'decreaseAmount'])
  mode!: 'set' | 'increasePct' | 'decreasePct' | 'increaseAmount' | 'decreaseAmount';

  /** Valor: precio (set/amount) o porcentaje (pct), hasta 2 decimales. */
  @IsNumberString()
  @Matches(MONEY, { message: 'value debe ser un número con hasta 2 decimales' })
  value!: string;
}

export class BulkStockLevelsDto extends BulkTargetDto {
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
}
