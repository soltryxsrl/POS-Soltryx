import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../../common/persistence/unit-of-work.port';
import { QueryFailedError } from 'typeorm';
import type { CashSession } from '../../domain/entities/cash-session.entity';
import {
  CashRegisterInactiveError,
  CashRegisterNotFoundError,
  CashSessionAlreadyOpenError,
  InvalidCashAmountError,
} from '../../domain/errors/cash-session.errors';
import {
  CASH_REGISTER_REPOSITORY,
  type CashRegisterRepository,
} from '../../domain/ports/cash-register.repository.port';
import {
  CASH_SESSION_REPOSITORY,
  type CashSessionRepository,
} from '../../domain/ports/cash-session.repository.port';

export interface OpenCashSessionInput {
  cashRegisterId: string;
  openingAmount: string;
  notes?: string | null;
  openedById: string;
}

@Injectable()
export class OpenCashSessionUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CASH_REGISTER_REPOSITORY)
    private readonly registers: CashRegisterRepository,
    @Inject(CASH_SESSION_REPOSITORY)
    private readonly sessions: CashSessionRepository,
  ) {}

  async execute(input: OpenCashSessionInput): Promise<CashSession> {
    this.assertAmount(input.openingAmount);

    const register = await this.registers.findById(input.cashRegisterId);
    if (!register) throw new CashRegisterNotFoundError(input.cashRegisterId);
    if (!register.isActive) throw new CashRegisterInactiveError(register.id);

    const existing = await this.sessions.findActiveForRegister(register.id);
    if (existing) throw new CashSessionAlreadyOpenError(register.id, existing.id);

    try {
      return await this.uow.run((ctx) =>
        this.sessions.open(ctx, {
          cashRegisterId: register.id,
          openedById: input.openedById,
          openingAmount: input.openingAmount,
          notes: input.notes ?? null,
          branchId: register.branchId,
        }),
      );
    } catch (e) {
      // Race condition: el unique index parcial nos protege contra dos aperturas
      // simultáneas; lo convertimos al error de dominio.
      if (e instanceof QueryFailedError) {
        const driverErr = e.driverError as { code?: string } | undefined;
        if (driverErr?.code === '23505') {
          const refreshed = await this.sessions.findActiveForRegister(register.id);
          throw new CashSessionAlreadyOpenError(register.id, refreshed?.id ?? 'desconocida');
        }
      }
      throw e;
    }
  }

  private assertAmount(amount: string): void {
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      throw new InvalidCashAmountError(`Monto inválido: ${amount}`);
    }
    if (parseFloat(amount) < 0) {
      throw new InvalidCashAmountError('Monto inicial no puede ser negativo');
    }
  }
}
