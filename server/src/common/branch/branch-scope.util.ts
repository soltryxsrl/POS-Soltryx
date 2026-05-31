import { ForbiddenException } from '@nestjs/common';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/**
 * Helpers de scoping por sucursal. Se usan en los servicios scoped para:
 *   - filtrar listas/queries por la sucursal activa, y
 *   - validar que un recurso accedido por id pertenece a esa sucursal (anti-IDOR).
 *
 * No es una base class: los módulos tienen estilos mixtos (QueryBuilder /
 * hexagonal), así que estos son helpers de 1 línea que cada servicio invoca.
 */

/** Filtra un QueryBuilder por sucursal: `<alias>.branchId = :branchId`. */
export function applyBranchFilter<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  branchId: string,
): SelectQueryBuilder<T> {
  return qb.andWhere(`${alias}.branchId = :branchId`, { branchId });
}

/** Lanza 403 si la entidad no pertenece a la sucursal activa. */
export function assertSameBranch(
  entityBranchId: string | null,
  branchId: string,
): void {
  if (entityBranchId !== branchId) {
    throw new ForbiddenException('El recurso no pertenece a tu sucursal activa');
  }
}

const SWITCH_PERMISSION = 'branches.switch';

/**
 * Resuelve el "scope" de un reporte: si se pidió `branchId=all` y el usuario
 * tiene permiso de cambio de sucursal (`branches.switch`), devuelve `null` =
 * CONSOLIDADO (todas las sucursales). En cualquier otro caso devuelve la
 * sucursal activa. Así un cajero nunca puede consolidar fuera de su sucursal.
 */
export function resolveReportBranchScope(
  requested: string | undefined,
  activeBranchId: string,
  permissions: ReadonlyArray<string>,
): string | null {
  if (requested === 'all' && permissions.includes(SWITCH_PERMISSION)) {
    return null;
  }
  return activeBranchId;
}
