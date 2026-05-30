export const CashSessionStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const;
export type CashSessionStatus = (typeof CashSessionStatus)[keyof typeof CashSessionStatus];
