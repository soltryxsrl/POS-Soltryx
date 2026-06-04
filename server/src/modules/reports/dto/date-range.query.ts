import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class DateQuery {
  /** YYYY-MM-DD; default = hoy. */
  @IsOptional()
  @IsDateString()
  date?: string;

  /** Sucursal a consultar; `all` = consolidado (solo con permiso branches.switch). */
  @IsOptional()
  @IsString()
  branchId?: string;
}

export class DateRangeQuery {
  /** YYYY-MM-DD; default = primer día del mes. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** YYYY-MM-DD; default = hoy. */
  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  /** Días sin venta para "lento movimiento" (slow-movers). Default 30. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number = 30;

  /** Sucursal a consultar; `all` = consolidado (solo con permiso branches.switch). */
  @IsOptional()
  @IsString()
  branchId?: string;
}

/** Detalle de ventas línea por línea: rango + filtros opcionales + paginación. */
export class SalesDetailQuery {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  /** Sucursal a consultar; `all` = consolidado (solo con permiso branches.switch). */
  @IsOptional()
  @IsString()
  branchId?: string;
}
