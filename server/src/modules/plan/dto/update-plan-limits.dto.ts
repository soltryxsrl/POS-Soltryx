import { IsBoolean, IsInt, IsOptional, Min, ValidateIf } from 'class-validator';

/**
 * Cambio de plan (upsell). Cada campo:
 *   - número >= 1 → nuevo tope
 *   - null        → ilimitado
 *   - ausente     → no se modifica
 */
export class UpdatePlanLimitsDto {
  @ValidateIf((o) => o.maxUsers !== null && o.maxUsers !== undefined)
  @IsInt()
  @Min(1)
  maxUsers?: number | null;

  @ValidateIf((o) => o.maxBranches !== null && o.maxBranches !== undefined)
  @IsInt()
  @Min(1)
  maxBranches?: number | null;

  /** Interruptor de la función multi-sucursal. */
  @IsOptional()
  @IsBoolean()
  multiBranchEnabled?: boolean;
}
