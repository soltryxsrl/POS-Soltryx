export interface CashRegister {
  readonly id: string;
  readonly branchId: string | null;
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
}
