import type { TransactionContext } from '../../../../common/persistence/unit-of-work.port';
import type { Payment } from '../entities/payment.entity';
import type { Sale } from '../entities/sale.entity';
import type { SaleItem } from '../entities/sale-item.entity';
import type { PaymentMethod } from '../value-objects/payment-method';
import type { SaleStatus } from '../value-objects/sale-status';

export const SALE_REPOSITORY = Symbol('SALE_REPOSITORY');

export interface InsertSaleInput {
  branchId: string | null;
  saleNumber: string;
  customerId: string | null;
  userId: string;
  cashSessionId: string;
  subtotal: string;
  discountTotal: string;
  orderDiscount: string;
  taxTotal: string;
  tipTotal: string;
  total: string;
  /** Snapshot del modo de precio vigente al cobrar. */
  priceIncludesTax: boolean;
  notes: string | null;
  /** Si la venta requirió override de descuento, id del manager que autorizó. */
  discountAuthorizedById: string | null;
  /** Snapshot del nombre del autorizador al momento de la venta. */
  discountAuthorizedBySnapshot: string | null;
  /** Clave de idempotencia (POS offline). Null si la venta no la trae. */
  idempotencyKey?: string | null;
  items: Array<{
    productId: string | null;
    variantId?: string | null;
    variantNameSnapshot?: string | null;
    productNameSnapshot: string;
    productSkuSnapshot: string;
    quantity: string;
    unitPrice: string;
    discount: string;
    taxRate: string;
    taxTotal: string;
    total: string;
    /** Costo unitario vigente al vender (para margen histórico exacto). */
    unitCostSnapshot?: string | null;
    /** Receta del kit al momento de la venta (null si no era kit). */
    kitComponentsSnapshot?: Array<{
      componentProductId: string;
      quantity: string;
    }> | null;
    /** Nota libre de la línea (modificador, instrucción). */
    notes?: string | null;
  }>;
  payments: Array<{
    method: PaymentMethod;
    /** Monto en MONEDA BASE (DOP). */
    amount: string;
    /** Moneda original entregada. Default 'DOP'. */
    currencyCode?: string;
    /** Si moneda != base: monto original en esa moneda. */
    foreignAmount?: string | null;
    /** Tasa usada. */
    exchangeRate?: string | null;
    reference: string | null;
  }>;
}

export interface CancelSalePatch {
  cancelledById: string;
  cancelledAt: Date;
  cancelReason: string;
}

export type SaleSortColumn = 'createdAt' | 'total' | 'saleNumber';

export interface ListSalesFilter {
  q?: string;
  status?: SaleStatus;
  paymentMethod?: PaymentMethod;
  cashSessionId?: string;
  userId?: string;
  branchId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
}

export interface ListSalesResult {
  items: Sale[];
  total: number;
}

export interface SaleRepository {
  insert(ctx: TransactionContext, input: InsertSaleInput): Promise<Sale>;
  markCancelled(ctx: TransactionContext, saleId: string, patch: CancelSalePatch): Promise<Sale>;
  findById(id: string): Promise<Sale | null>;
  /** Busca una venta por su clave de idempotencia (POS offline). */
  findByIdempotencyKey(key: string): Promise<Sale | null>;
  /** Carga sale + items (sin payments) — usado por cancel para emitir reversals de stock. */
  findItemsForCancellation(ctx: TransactionContext, saleId: string): Promise<SaleItem[]>;
  /** Lookup payments para una sale (paginación interna no aplica). */
  findPaymentsForSale(saleId: string): Promise<Payment[]>;
  list(filter: ListSalesFilter): Promise<ListSalesResult>;
}
