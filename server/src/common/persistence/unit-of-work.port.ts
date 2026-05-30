import type { EntityManager } from 'typeorm';

/**
 * Token de inyección para el UnitOfWork.
 * Use cases del dominio dependen de este puerto, no de TypeORM directamente.
 */
export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

/**
 * Contexto transaccional pasado a la función dentro de `run`.
 * Los repositorios reciben este `manager` para que su trabajo viva en la misma transacción.
 */
export interface TransactionContext {
  readonly manager: EntityManager;
}

/**
 * Puerto de Unit of Work.
 *
 * Permite a los use cases ejecutar trabajo transaccional sin depender de TypeORM.
 * El adapter `UnitOfWorkTypeOrm` envuelve `DataSource.transaction()`.
 *
 * Uso típico desde un use case:
 *
 *   await this.uow.run(async (ctx) => {
 *     const sale = await this.saleRepo.save(ctx, draft);
 *     await this.stockPort.applySaleMovements(ctx, sale);
 *     return sale;
 *   });
 */
export interface UnitOfWork {
  run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T>;
}
