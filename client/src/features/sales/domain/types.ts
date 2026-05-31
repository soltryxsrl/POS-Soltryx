import type { MoneyDto, PaymentMethod, SaleStatus, FiscalStatus } from '@/shared/types/enums';

/** Snapshot del comprobante fiscal emitido para una venta. */
export interface SaleFiscalDocument {
  id: string;
  /** Código DGII (E31/E32/B01/B02/etc.). */
  docType: string;
  /** NCF completo emitido. */
  ncf: string;
  status: 'ISSUED' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED';
  buyerName: string | null;
  buyerRnc: string | null;
  issueDate: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  /** Si la venta fue de una variante, su id. */
  variantId: string | null;
  variantNameSnapshot: string | null;
  productNameSnapshot: string;
  productSkuSnapshot: string;
  quantity: string;
  unitPrice: MoneyDto;
  discount: MoneyDto;
  taxRate: string;
  taxTotal: MoneyDto;
  total: MoneyDto;
  /** Nota libre de la línea (modificador, instrucción). */
  notes: string | null;
  createdAt: string;
}

export interface SalePayment {
  id: string;
  saleId: string;
  method: PaymentMethod;
  /** Monto en moneda base (DOP). */
  amount: MoneyDto;
  /** Moneda con que pagó el cliente. 'DOP' si pagó en base. */
  currencyCode: string;
  /** Monto original en moneda extranjera. null si pagó en base. */
  foreignAmount: MoneyDto | null;
  /** Tasa aplicada (1 extranjera = N DOP). null si pagó en base. */
  exchangeRate: string | null;
  reference: string | null;
  status: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  branchId: string | null;
  saleNumber: string;
  customerId: string | null;
  userId: string;
  cashSessionId: string;
  subtotal: MoneyDto;
  discountTotal: MoneyDto;
  orderDiscount: MoneyDto;
  taxTotal: MoneyDto;
  tipTotal: MoneyDto;
  total: MoneyDto;
  /** Snapshot del modo de precio al cobrar: true = los montos ya incluían ITBIS. */
  priceIncludesTax: boolean;
  /** UUID público para compartir el recibo sin login (URL /r/{token}). */
  publicToken: string;
  status: SaleStatus;
  fiscalStatus: FiscalStatus;
  fiscalDocumentId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  cancelledById: string | null;
  cancelReason: string | null;
  /** Manager que autorizó un descuento alto. Null si no aplicó. */
  discountAuthorizedById: string | null;
  /** Snapshot del nombre del autorizador al momento de la venta. */
  discountAuthorizedBySnapshot: string | null;
  /** Documento fiscal emitido (NCF + tipo + buyer). Null si no se emitió. */
  fiscalDocument: SaleFiscalDocument | null;
  /** Nota de crédito (E34/B04) emitida al cancelar la venta. Null si no aplicó. */
  creditNoteFiscalDocument: SaleFiscalDocument | null;
  items: SaleItem[];
  payments: SalePayment[];
}

export interface SalesList {
  items: Sale[];
  total: number;
}

export interface CreateSaleInput {
  cashSessionId: string;
  customerId?: string;
  notes?: string;
  /**
   * Código DGII del tipo de comprobante (E31/E32/B01/B02/etc.). Si se incluye,
   * el server reserva NCF y crea fiscal_documents. Si null/undefined, la venta
   * se emite como "Recibo no fiscal".
   */
  fiscalDocTypeCode?: string;
  orderDiscount?: MoneyDto;
  tipTotal?: MoneyDto;
  items: Array<{
    /** Catálogo: id del producto. Se OMITE en ítems de "monto libre". */
    productId?: string;
    /** Si se vende una variante específica, su id. */
    variantId?: string;
    /** Monto libre: descripción que se imprime como nombre de la línea. */
    description?: string;
    /** Monto libre: precio unitario tecleado por el cajero. */
    unitPrice?: MoneyDto;
    /** Monto libre: tasa de ITBIS (default '0.00'). */
    taxRate?: string;
    quantity: string;
    discount?: MoneyDto;
    /** Nota libre de la línea (modificador, instrucción). */
    notes?: string;
  }>;
  payments: Array<{
    method: PaymentMethod;
    /** Monto en `currencyCode`. El server lo convierte a DOP. */
    amount: MoneyDto;
    /** ISO 4217. Default 'DOP'. */
    currencyCode?: string;
    reference?: string;
  }>;
  /**
   * Credenciales del manager que autoriza un descuento alto. Solo necesario si
   * el descuento aplicado supera el umbral configurado en el server.
   */
  overrideCredentials?: {
    emailOrUsername: string;
    password: string;
  };
  /**
   * Clave de idempotencia (UUID). El POS la genera por venta; si la venta se
   * encola offline y luego se reenvía, el server la usa para no duplicar el cobro.
   */
  idempotencyKey?: string;
}

export interface ListSalesParams {
  q?: string;
  status?: SaleStatus;
  paymentMethod?: PaymentMethod;
  cashSessionId?: string;
  userId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
}
