export interface SaleItem {
  readonly id: string;
  readonly saleId: string;
  /** Null para líneas de "monto libre" (no referencian producto del catálogo). */
  readonly productId: string | null;
  /** Si la venta fue de una variante, su id (los snapshots son los de la variante). */
  readonly variantId: string | null;
  readonly variantNameSnapshot: string | null;
  readonly productNameSnapshot: string;
  readonly productSkuSnapshot: string;
  readonly quantity: string;
  readonly unitPrice: string;
  readonly discount: string;
  readonly taxRate: string;
  readonly taxTotal: string;
  readonly total: string;
  /** Receta del kit al momento de la venta (null si no era kit). */
  readonly kitComponentsSnapshot: ReadonlyArray<{
    componentProductId: string;
    quantity: string;
  }> | null;
  /** Nota de la línea (modificador, instrucción especial). Texto libre. */
  readonly notes: string | null;
  readonly createdAt: Date;
}
