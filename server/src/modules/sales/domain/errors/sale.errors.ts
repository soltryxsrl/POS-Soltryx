export class NoCashSessionError extends Error {
  readonly code = 'NO_CASH_SESSION';
  constructor() {
    super('Necesitas una sesión de caja abierta para registrar ventas');
    this.name = 'NoCashSessionError';
  }
}

export class CashSessionMismatchError extends Error {
  readonly code = 'CASH_SESSION_MISMATCH';
  constructor() {
    super('La sesión de caja no está abierta o no pertenece al usuario');
    this.name = 'CashSessionMismatchError';
  }
}

export class ProductNotForSaleError extends Error {
  readonly code = 'PRODUCT_NOT_FOR_SALE';
  constructor(productId: string, reason: string) {
    super(`Producto ${productId} no disponible para venta: ${reason}`);
    this.name = 'ProductNotForSaleError';
  }
}

export class SaleHasNoItemsError extends Error {
  readonly code = 'SALE_HAS_NO_ITEMS';
  constructor() {
    super('La venta debe tener al menos un ítem');
    this.name = 'SaleHasNoItemsError';
  }
}

export class SaleHasNoPaymentsError extends Error {
  readonly code = 'SALE_HAS_NO_PAYMENTS';
  constructor() {
    super('La venta debe tener al menos un pago');
    this.name = 'SaleHasNoPaymentsError';
  }
}

export class PaymentInsufficientError extends Error {
  readonly code = 'PAYMENT_INSUFFICIENT';
  constructor(public total: string, public paid: string) {
    super(`Pagos insuficientes: total ${total}, pagado ${paid}`);
    this.name = 'PaymentInsufficientError';
  }
}

export class InvalidDiscountError extends Error {
  readonly code = 'INVALID_DISCOUNT';
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDiscountError';
  }
}

export class OpenItemInvalidError extends Error {
  readonly code = 'OPEN_ITEM_INVALID';
  constructor() {
    super('Un ítem de monto libre requiere descripción y precio unitario');
    this.name = 'OpenItemInvalidError';
  }
}

export class SaleNotFoundError extends Error {
  readonly code = 'SALE_NOT_FOUND';
  constructor(id: string) {
    super(`Venta ${id} no encontrada`);
    this.name = 'SaleNotFoundError';
  }
}

export class SaleNotCancellableError extends Error {
  readonly code = 'SALE_NOT_CANCELLABLE';
  constructor(saleId: string, currentStatus: string) {
    super(`Venta ${saleId} no puede cancelarse (status actual: ${currentStatus})`);
    this.name = 'SaleNotCancellableError';
  }
}

export class CustomerRequiredForAccountError extends Error {
  readonly code = 'CUSTOMER_REQUIRED_FOR_ACCOUNT';
  constructor() {
    super('Se requiere un cliente para venta a crédito');
    this.name = 'CustomerRequiredForAccountError';
  }
}

export class DiscountOverrideRequiredError extends Error {
  readonly code = 'DISCOUNT_OVERRIDE_REQUIRED';
  constructor(public percentage: number, public thresholdPct: number) {
    super(
      `Descuento ${percentage.toFixed(1)}% supera el umbral ${thresholdPct}%. Requiere autorización de un manager.`,
    );
    this.name = 'DiscountOverrideRequiredError';
  }
}

export class DiscountOverrideInvalidError extends Error {
  readonly code = 'DISCOUNT_OVERRIDE_INVALID';
  constructor(message: string) {
    super(message);
    this.name = 'DiscountOverrideInvalidError';
  }
}
