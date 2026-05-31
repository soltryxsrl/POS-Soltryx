import type { CashRegister } from '../entities/cash-register.entity';

export const CASH_REGISTER_REPOSITORY = Symbol('CASH_REGISTER_REPOSITORY');

export interface CashRegisterRepository {
  list(filter?: { isActive?: boolean; branchId?: string }): Promise<CashRegister[]>;
  findById(id: string): Promise<CashRegister | null>;
  create(input: {
    name: string;
    code?: string;
    branchId: string;
  }): Promise<CashRegister>;
}
