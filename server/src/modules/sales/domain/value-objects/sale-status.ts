export const SaleStatus = {
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;
export type SaleStatus = (typeof SaleStatus)[keyof typeof SaleStatus];

export const FiscalStatus = {
  NOT_REQUIRED: 'NOT_REQUIRED',
  PENDING: 'PENDING',
  ISSUED: 'ISSUED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;
export type FiscalStatus = (typeof FiscalStatus)[keyof typeof FiscalStatus];
