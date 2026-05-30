export interface SaleItem {
  readonly id: string;
  readonly saleId: string;
  readonly productId: string;
  readonly productNameSnapshot: string;
  readonly productSkuSnapshot: string;
  readonly quantity: string;
  readonly unitPrice: string;
  readonly discount: string;
  readonly taxRate: string;
  readonly taxTotal: string;
  readonly total: string;
  readonly createdAt: Date;
}
