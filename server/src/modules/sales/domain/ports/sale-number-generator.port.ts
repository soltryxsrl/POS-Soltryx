import type { TransactionContext } from '../../../../common/persistence/unit-of-work.port';

export const SALE_NUMBER_GENERATOR = Symbol('SALE_NUMBER_GENERATOR');

/**
 * Genera el siguiente `sale_number` legible (`S-NNNNNN`).
 * Implementación con Postgres SEQUENCE → concurrent-safe sin locks adicionales.
 */
export interface SaleNumberGenerator {
  next(ctx: TransactionContext): Promise<string>;
}
