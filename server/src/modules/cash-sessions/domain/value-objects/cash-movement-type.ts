export const CashMovementType = {
  PAID_IN: 'PAID_IN',
  PAID_OUT: 'PAID_OUT',
} as const;

export type CashMovementType = (typeof CashMovementType)[keyof typeof CashMovementType];
