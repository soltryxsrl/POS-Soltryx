/** Forma de pago configurable. `code` es la clase de comportamiento. */
export interface PaymentMethodConfig {
  /** Clase de comportamiento: CASH / CARD / TRANSFER / ACCOUNT / OTHER. */
  code: string;
  name: string;
  /** Si true, el POS pide una referencia (voucher, últimos 4 dígitos). */
  requiresReference: boolean;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePaymentMethodInput {
  name?: string;
  requiresReference?: boolean;
  isActive?: boolean;
}
