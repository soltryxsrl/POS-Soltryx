import type { FiscalStatus, SaleStatus } from '../value-objects/sale-status';
import type { Payment } from './payment.entity';
import type { SaleItem } from './sale-item.entity';

/**
 * Snapshot del comprobante fiscal asociado a la venta. Si la venta no emitió
 * NCF (fiscalStatus=NOT_REQUIRED), este campo es null.
 */
export interface SaleFiscalDocument {
  readonly id: string;
  /** Código DGII: E31/E32/B01/B02/etc. */
  readonly docType: string;
  /** NCF completo, ej. E3200000000001 o B0200000001. */
  readonly ncf: string;
  readonly status: 'ISSUED' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED';
  readonly buyerName: string | null;
  readonly buyerRnc: string | null;
  readonly issueDate: Date;
}

export interface Sale {
  readonly id: string;
  readonly branchId: string | null;
  readonly saleNumber: string;
  readonly customerId: string | null;
  readonly userId: string;
  readonly cashSessionId: string;
  readonly subtotal: string;
  readonly discountTotal: string;
  readonly orderDiscount: string;
  readonly taxTotal: string;
  readonly tipTotal: string;
  readonly total: string;
  /** Snapshot del modo de precio: true = los montos ya incluían ITBIS. */
  readonly priceIncludesTax: boolean;
  /** UUID para URL pública del recibo (sin login). */
  readonly publicToken: string;
  readonly status: SaleStatus;
  readonly fiscalStatus: FiscalStatus;
  readonly fiscalDocumentId: string | null;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly cancelledAt: Date | null;
  readonly cancelledById: string | null;
  readonly cancelReason: string | null;
  /** Manager que autorizó un descuento sobre el umbral. Null si no aplicó. */
  readonly discountAuthorizedById: string | null;
  /** Nombre del autorizador al momento de la venta. Null si no aplicó. */
  readonly discountAuthorizedBySnapshot: string | null;
  /** Documento fiscal emitido (NCF + tipo + buyer). Null si no se emitió. */
  readonly fiscalDocument: SaleFiscalDocument | null;
  /** Nota de crédito emitida al cancelar (E34 si la original era e-CF, B04 si
   *  tradicional). Null si no se emitió o la venta sigue activa. */
  readonly creditNoteFiscalDocument: SaleFiscalDocument | null;
  readonly items: SaleItem[];
  readonly payments: Payment[];
}
