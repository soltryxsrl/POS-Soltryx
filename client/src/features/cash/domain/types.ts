import type { CashSessionStatus, MoneyDto } from '@/shared/types/enums';

export interface CashRegister {
  id: string;
  branchId: string | null;
  code: string;
  name: string;
  isActive: boolean;
}

/**
 * Mapa denominación-en-pesos → cantidad contada.
 * Claves esperadas: "2000","1000","500","200","100","50","25","10","5","1","0.25","0.10","0.05","0.01"
 */
export type DenominationCounts = Record<string, number>;

export interface CashSession {
  id: string;
  branchId: string | null;
  cashRegisterId: string;
  openedById: string;
  closedById: string | null;
  openedAt: string;
  closedAt: string | null;
  openingAmount: MoneyDto;
  openingDenominations: DenominationCounts | null;
  expectedAmount: MoneyDto | null;
  countedAmount: MoneyDto | null;
  closingDenominations: DenominationCounts | null;
  /** Monto declarado por el cajero al cerrar, por método de pago. */
  closingDeclaredByMethod: Record<string, MoneyDto> | null;
  difference: MoneyDto | null;
  status: CashSessionStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CashSessionSummary {
  session: CashSession;
  openingAmount: MoneyDto;
  cashSales: MoneyDto;
  cashRefunds: MoneyDto;
  nonCashSales: MoneyDto;
  paidIns: MoneyDto;
  paidOuts: MoneyDto;
  expectedAmount: MoneyDto;
  countedAmount: MoneyDto | null;
  difference: MoneyDto | null;
}

export type CashMovementType = 'PAID_IN' | 'PAID_OUT';

export interface CashMovement {
  id: string;
  cashSessionId: string;
  type: CashMovementType;
  amount: MoneyDto;
  reason: string;
  userId: string;
  createdAt: string;
}

export interface RecordCashMovementInput {
  type: CashMovementType;
  amount: MoneyDto;
  reason: string;
}

export interface SaleByMethodRow {
  method: string;
  count: number;
  /** Total registrado por el sistema (POS). */
  total: MoneyDto;
  /** Monto declarado por el cajero al cerrar. Null si no se declaró. */
  declared: MoneyDto | null;
  /** Diferencia declared − total (positivo = sobrante, negativo = faltante). */
  difference: MoneyDto | null;
}

export interface SaleItemAggRow {
  productNameSnapshot: string;
  productSkuSnapshot: string;
  quantity: string;
  total: MoneyDto;
}

export interface SessionReport {
  kind: 'X' | 'Z';
  session: CashSession;
  generatedAt: string;
  openingAmount: MoneyDto;
  openingDenominations: DenominationCounts | null;
  salesCount: number;
  salesCancelled: number;
  cashSales: MoneyDto;
  cashRefunds: MoneyDto;
  nonCashSales: MoneyDto;
  taxTotal: MoneyDto;
  discountTotal: MoneyDto;
  byMethod: SaleByMethodRow[];
  /** Items vendidos agregados por producto durante el turno. */
  itemsSold: SaleItemAggRow[];
  paidIns: MoneyDto;
  paidOuts: MoneyDto;
  movements: CashMovement[];
  expectedAmount: MoneyDto;
  countedAmount: MoneyDto | null;
  closingDenominations: DenominationCounts | null;
  difference: MoneyDto | null;
}

export interface OpenCashSessionInput {
  cashRegisterId: string;
  openingAmount: MoneyDto;
  openingDenominations?: DenominationCounts;
  notes?: string;
}

export interface CloseCashSessionInput {
  countedAmount: MoneyDto;
  closingDenominations?: DenominationCounts;
  /** Mapa methodCode → monto declarado por el cajero. */
  closingDeclaredByMethod?: Record<string, MoneyDto>;
  notes?: string;
}

export interface CashSessionsList {
  items: CashSession[];
  total: number;
}

export interface ListSessionsParams {
  status?: CashSessionStatus;
  cashRegisterId?: string;
  openedById?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
}
