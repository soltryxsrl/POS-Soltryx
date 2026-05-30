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
  taxTotal: string;
  total: string;
  notes: string | null;
  items: Array<{
    productId: string;
    productNameSnapshot: string;
    productSkuSnapshot: string;
    quantity: string;
    unitPrice: string;
    discount: string;
    taxRate: string;
    taxTotal: string;
    total: string;
  }>;
  payments: Array<{
    method: PaymentMethod;
    amount: string;
    reference: string | null;
  }>;
}

export interface CancelSalePatch {
  cancelledById: string;
  cancelledAt: Date;
  cancelReason: string;
}

export interface ListSalesFilter {
  status?: SaleStatus;
  cashSessionId?: string;
  userId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface ListSalesResult {
  items: Sale[];
  total: number;
}

export interface SaleRepository {
  insert(ctx: TransactionContext, input: InsertSaleInput): Promise<Sale>;
  markCancelled(ctx: TransactionContext, saleId: string, patch: CancelSalePatch): Promise<Sale>;
  findById(id: string): Promise<Sale | null>;
  /** Carga sale + items (sin payments) — usado por cancel para emitir reversals de stock. */
  findItemsForCancellation(ctx: TransactionContext, saleId: string): Promise<SaleItem[]>;
  /** Lookup payments para una sale (paginación interna no aplica). */
  findPaymentsForSale(saleId: string): Promise<Payment[]>;
  list(filter: ListSalesFilter): Promise<ListSalesResult>;
}
