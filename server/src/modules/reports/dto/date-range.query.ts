import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class DateQuery {
  /** YYYY-MM-DD; default = hoy. */
  @IsOptional()
  @IsDateString()
  date?: string;
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
}
