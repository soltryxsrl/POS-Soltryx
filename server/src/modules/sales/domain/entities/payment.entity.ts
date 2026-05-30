import type { PaymentMethod, PaymentStatus } from '../value-objects/payment-method';

export interface Payment {
  readonly id: string;
  readonly saleId: string;
  readonly method: PaymentMethod;
  /** Monto en moneda base (DOP). */
  readonly amount: string;
  /** Código de moneda con que pagó el cliente. 'DOP' si fue base. */
  readonly currencyCode: string;
  /** Monto original en moneda extranjera. Null si pagó en base. */
  readonly foreignAmount: string | null;
  /** Tasa aplicada (1 unidad extranjera = N DOP). Null si pagó en base. */
  readonly exchangeRate: string | null;
  readonly reference: string | null;
  readonly status: PaymentStatus;
  readonly createdAt: Date;
}
