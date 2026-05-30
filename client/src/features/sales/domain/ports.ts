import type { CreateSaleInput, ListSalesParams, Sale, SalesList } from './types';

/**
 * Puerto del feature Sales (frontend).
 *
 * Cualquier adapter compatible puede sustituirse:
 *   - `SalesApiHttp`      — backend NestJS
 *   - `SalesApiIndexedDb` — modo offline (futuro)
 *   - `SalesApiMock`      — tests
 */
export interface SalesApi {
  create(input: CreateSaleInput): Promise<Sale>;
  findById(id: string): Promise<Sale>;
  list(params?: ListSalesParams): Promise<SalesList>;
  cancel(id: string, reason: string): Promise<Sale>;
}
