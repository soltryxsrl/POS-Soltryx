export class ProductNotFoundForStockError extends Error {
  readonly code = 'PRODUCT_NOT_FOUND';
  constructor(productId: string) {
    super(`Producto ${productId} no encontrado`);
    this.name = 'ProductNotFoundForStockError';
  }
}

export class InsufficientStockError extends Error {
  readonly code = 'INSUFFICIENT_STOCK';
  constructor(
    public readonly productId: string,
    public readonly available: string,
    public readonly requested: string,
  ) {
    super(`Stock insuficiente: producto ${productId} tiene ${available}, se requiere ${requested}`);
    this.name = 'InsufficientStockError';
  }
}

export class InvalidStockQuantityError extends Error {
  readonly code = 'INVALID_STOCK_QUANTITY';
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStockQuantityError';
  }
}
