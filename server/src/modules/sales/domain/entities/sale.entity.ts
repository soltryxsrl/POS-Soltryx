import type { FiscalStatus, SaleStatus } from '../value-objects/sale-status';
import type { Payment } from './payment.entity';
import type { SaleItem } from './sale-item.entity';

export interface Sale {
  readonly id: string;
  readonly branchId: string | null;
  readonly saleNumber: string;
  readonly customerId: string | null;
  readonly userId: string;
  readonly cashSessionId: string;
  readonly subtotal: string;
  readonly discountTotal: string;
  readonly taxTotal: string;
  readonly total: string;
  readonly status: SaleStatus;
  readonly fiscalStatus: FiscalStatus;
  readonly fiscalDocumentId: string | null;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly cancelledAt: Date | null;
  readonly cancelledById: string | null;
  readonly cancelReason: string | null;
  readonly items: SaleItem[];
  readonly payments: Payment[];
}
