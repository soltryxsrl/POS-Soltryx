import type { PaymentMethod, PaymentStatus } from '../value-objects/payment-method';

export interface Payment {
  readonly id: string;
  readonly saleId: string;
  readonly method: PaymentMethod;
  readonly amount: string;
  readonly reference: string | null;
  readonly status: PaymentStatus;
  readonly createdAt: Date;
}
