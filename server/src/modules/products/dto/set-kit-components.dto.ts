import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumberString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';

const QTY = /^\d+(\.\d{1,3})?$/;

export class KitComponentDto {
  @IsUUID()
  productId!: string;

  @IsNumberString()
  @Matches(QTY, { message: 'quantity debe tener hasta 3 decimales' })
  quantity!: string;
}

/**
 * Reemplaza por completo la receta del kit con la lista provista. Para borrar
 * todos los componentes, enviar `components: []` y luego el caller debería
 * marcar `isKit=false` si ya no quiere que el producto se comporte como kit.
 */
export class SetKitComponentsDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => KitComponentDto)
  components!: KitComponentDto[];
}
