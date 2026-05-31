export type StockCountStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';

export interface StockCountItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  sku: string;
  countedQty: string;
  systemQty: string | null;
  variance: string | null;
  unitCost: string | null;
  varianceValue: string | null;
}

export interface StockCount {
  id: string;
  countNumber: string;
  branchId: string;
  status: StockCountStatus;
  notes: string | null;
  items: StockCountItem[];
  itemsWithVariance: number;
  totalVarianceValue: string | null;
  createdById: string;
  completedById: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface StockCountsList {
  items: StockCount[];
  total: number;
}
