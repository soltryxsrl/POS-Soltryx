import { IsUUID } from 'class-validator';

export class CloneCatalogRequestDto {
  /** Sucursal origen desde la cual se copia el catálogo a la sucursal activa. */
  @IsUUID()
  sourceBranchId!: string;
}
