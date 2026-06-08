import type { MoneyDto } from '@/shared/types/enums';

export type PurchaseOrderStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  productSkuSnapshot: string;
  orderedQuantity: string;
  receivedQuantity: string;
  unitCost: MoneyDto;
  taxRate: string;
  taxTotal: MoneyDto;
  total: MoneyDto;
}

export interface PurchaseOrder {
  id: string;
  branchId: string | null;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  expectedDate: string | null;
  supplierInvoice: string | null;
  /** Tipo de comprobante DGII del proveedor (B01/B14/B11/E41/E43). Null si no fiscal. */
  supplierFiscalDocTypeCode: string | null;
  /** NCF que aparece en la factura del proveedor. Va al 606. */
  supplierNcf: string | null;
  /** Fecha del comprobante del proveedor (YYYY-MM-DD). */
  supplierInvoiceDate: string | null;
  /** Forma de pago al proveedor (CASH/TRANSFER/CARD/CREDIT/OTHER). Va al 606. */
  paymentMethod: string | null;
  /** Retenciones (606): ITBIS retenido (col 12), ISR retenido (col 18), tipo ISR (col 17). */
  itbisRetenido: MoneyDto;
  isrRetenido: MoneyDto;
  isrRetentionType: string | null;
  subtotal: MoneyDto;
  taxTotal: MoneyDto;
  total: MoneyDto;
  notes: string | null;
  createdById: string;
  receivedAt: string | null;
  receivedById: string | null;
  cancelledAt: string | null;
  cancelledById: string | null;
  cancelReason: string | null;
  items: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrdersList {
  items: PurchaseOrder[];
  total: number;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  expectedDate?: string;
  supplierInvoice?: string;
  /** Datos fiscales DGII del proveedor — opcionales. Si se incluye el tipo,
   *  los otros 2 son requeridos (server lo valida). */
  supplierFiscalDocTypeCode?: string;
  supplierNcf?: string;
  supplierInvoiceDate?: string;
  /** Forma de pago al proveedor (para la columna 23 del 606). */
  paymentMethod?: string;
  /** Retenciones al proveedor (606): solo si el negocio es agente de retención. */
  itbisRetenido?: string;
  isrRetenido?: string;
  isrRetentionType?: string;
  notes?: string;
  items: Array<{
    productId: string;
    orderedQuantity: string;
    unitCost: MoneyDto;
    taxRate?: string;
  }>;
}

export interface ReceivePurchaseOrderInput {
  items: Array<{ itemId: string; quantity: string }>;
  updateProductCost?: boolean;
}

/** Edición de solo los datos fiscales (comprobante 606) de una compra existente. */
export interface UpdateFiscalDataInput {
  supplierFiscalDocTypeCode?: string;
  supplierNcf?: string;
  supplierInvoiceDate?: string;
  paymentMethod?: string;
  itbisRetenido?: string;
  isrRetenido?: string;
  isrRetentionType?: string;
}

export interface ListPurchaseOrdersParams {
  q?: string;
  supplierId?: string;
  status?: PurchaseOrderStatus;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
}
