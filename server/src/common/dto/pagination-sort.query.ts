import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export type SortDir = 'asc' | 'desc';

export class PaginationSortQuery {
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

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sort?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsIn(['asc', 'desc'])
  sortDir?: SortDir;
}

/**
 * Resuelve `sort/sortDir` contra una whitelist de columnas permitidas.
 * Si la columna pedida no está en la whitelist o no se pidió sort,
 * cae al default.
 */
export function resolveSort<T extends string>(
  requested: string | undefined,
  dir: SortDir | undefined,
  allowed: readonly T[],
  fallback: { column: T; dir: SortDir },
): { column: T; dir: SortDir } {
  const column =
    requested && (allowed as readonly string[]).includes(requested)
      ? (requested as T)
      : fallback.column;
  const direction: SortDir = dir ?? fallback.dir;
  return { column, dir: direction };
}
