/**
 * Enums del dominio del POS.
 * Mantener sincronizados con los del server (ver: server/src/.../enums o constantes).
 */

export const SaleStatus = {
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;
export type SaleStatus = (typeof SaleStatus)[keyof typeof SaleStatus];

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  TRANSFER: 'TRANSFER',
  OTHER: 'OTHER',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/**
 * Tipos de e-CF según DGII República Dominicana.
 *   31 - Factura de Crédito Fiscal Electrónica
 *   32 - Factura de Consumo Electrónica
 *   33 - Nota de Débito Electrónica
 *   34 - Nota de Crédito Electrónica
 */
export const FiscalDocType = {
  E_CREDIT_FISCAL: '31',
  E_CONSUMER: '32',
  E_DEBIT_NOTE: '33',
  E_CREDIT_NOTE: '34',
} as const;
export type FiscalDocType = (typeof FiscalDocType)[keyof typeof FiscalDocType];

export const FiscalStatus = {
  NOT_REQUIRED: 'NOT_REQUIRED',
  PENDING: 'PENDING',
  ISSUED: 'ISSUED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;
export type FiscalStatus = (typeof FiscalStatus)[keyof typeof FiscalStatus];

export const StockMovementType = {
  PURCHASE: 'PURCHASE',
  SALE: 'SALE',
  RETURN: 'RETURN',
  ADJUSTMENT: 'ADJUSTMENT',
  CANCELLED_SALE: 'CANCELLED_SALE',
} as const;
export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];

export const CashSessionStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const;
export type CashSessionStatus = (typeof CashSessionStatus)[keyof typeof CashSessionStatus];

export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  CASHIER: 'CASHIER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const Currency = {
  DOP: 'DOP',
  USD: 'USD',
} as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

/**
 * Representación de dinero en transporte (DTOs JSON).
 * Siempre string para evitar imprecisión de float. Formato "1234.56".
 */
export type MoneyDto = string;

/**
 * Forma estándar de error que devuelve la API.
 */
export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path?: string;
}
