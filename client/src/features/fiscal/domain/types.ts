export type FiscalDocAppliesTo = 'SALE' | 'PURCHASE' | 'BOTH';

export interface FiscalDocType {
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  requiresBuyerRnc: boolean;
  appliesTo: FiscalDocAppliesTo;
  createdAt: string;
  updatedAt: string;
}

export interface FiscalSequence {
  id: string;
  docType: string;
  prefix: string;
  rangeFrom: string;
  rangeTo: string;
  nextNumber: string;
  validUntil: string | null;
  isActive: boolean;
  consumed: number;
  remaining: number;
  daysToExpire: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFiscalSequenceInput {
  docType: string;
  prefix: string;
  rangeFrom: number;
  rangeTo: number;
  validUntil?: string;
}

export interface RenewFiscalSequenceInput {
  prefix?: string;
  rangeFrom: number;
  rangeTo: number;
  validUntil?: string;
}

export type FiscalDocumentStatus =
  | 'ISSUED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'CANCELLED';

export interface FiscalDocumentListItem {
  id: string;
  /** Null para standalone (E41/E43/B11/B13 compras informales / gastos menores). */
  saleId: string | null;
  docType: string;
  ncf: string;
  issueDate: string;
  buyerName: string | null;
  buyerRnc: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  status: FiscalDocumentStatus;
  createdAt: string;
}

export interface IssueStandaloneDocumentInput {
  /** E41/B11 (compras informales) o E43/B13 (gastos menores). */
  docTypeCode: 'E41' | 'E43' | 'B11' | 'B13';
  counterpartyName?: string;
  counterpartyRnc?: string;
  subtotal: string;
  taxTotal?: string;
  total: string;
  items?: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    discount?: string;
    taxRate?: string;
    taxTotal?: string;
    total: string;
  }>;
}

export interface FiscalDocumentsListResponse {
  items: FiscalDocumentListItem[];
  total: number;
}

export interface ListFiscalDocumentsParams {
  q?: string;
  docType?: string;
  status?: FiscalDocumentStatus;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface Fiscal607Row {
  tipoIdentificacion: string;
  documento: string;
  ncf: string;
  ncfModificado: string;
  tipoIngreso: string;
  fechaComprobante: string;
  montoFacturado: string;
  itbisFacturado: string;
  propinaLegal: string;
  formaPago: string;
  saleId: string;
  saleNumber: string;
  docType: string;
  buyerName: string | null;
  total: string;
}

export interface Fiscal607Summary {
  totalRows: number;
  totalFacturado: string;
  totalItbis: string;
  totalPropina: string;
  notasCredito: number;
}

export interface Fiscal607Response {
  rows: Fiscal607Row[];
  summary: Fiscal607Summary;
}

export interface Fiscal606Row {
  rncCedula: string;
  tipoIdentificacion: string;
  tipoBienesServicios: string;
  ncf: string;
  ncfModificado: string;
  fechaComprobante: string;
  fechaPago: string;
  montoServicios: string;
  montoBienes: string;
  totalFacturado: string;
  itbisFacturado: string;
  purchaseOrderId: string;
  orderNumber: string;
  supplierName: string;
  supplierFiscalDocTypeCode: string;
}

export interface Fiscal606Summary {
  totalRows: number;
  totalFacturado: string;
  totalItbis: string;
  comprasConNcf: number;
}

export interface Fiscal606Response {
  rows: Fiscal606Row[];
  summary: Fiscal606Summary;
}
