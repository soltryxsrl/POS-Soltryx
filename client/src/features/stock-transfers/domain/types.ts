export type StockTransferStatus = 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface StockTransferItem {
  id: string;
  sku: string;
  productNameSnapshot: string;
  sourceProductId: string;
  destProductId: string;
  quantity: string;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceBranchId: string;
  sourceBranchName: string | null;
  destBranchId: string;
  destBranchName: string | null;
  status: StockTransferStatus;
  notes: string | null;
  items: StockTransferItem[];
  createdById: string;
  receivedById: string | null;
  receivedAt: string | null;
  cancelledById: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

export interface StockTransfersList {
  items: StockTransfer[];
  total: number;
}

export interface CreateStockTransferInput {
  destBranchId: string;
  notes?: string;
  items: Array<{ productId: string; quantity: string }>;
}
