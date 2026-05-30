import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloseCashSessionUseCase } from './application/use-cases/close-cash-session.use-case';
import { GetActiveSessionUseCase } from './application/use-cases/get-active-session.use-case';
import { GetSessionSummaryUseCase } from './application/use-cases/get-session-summary.use-case';
import { ListSessionsUseCase } from './application/use-cases/list-sessions.use-case';
import { OpenCashSessionUseCase } from './application/use-cases/open-cash-session.use-case';
import { CASH_PAYMENT_TOTALS_PORT } from './domain/ports/cash-payment-totals.port';
import { CASH_REGISTER_REPOSITORY } from './domain/ports/cash-register.repository.port';
import { CASH_SESSION_REPOSITORY } from './domain/ports/cash-session.repository.port';
import { CashRegistersController } from './infrastructure/http/cash-registers.controller';
import { CashSessionsController } from './infrastructure/http/cash-sessions.controller';
import { CashPaymentTotalsAdapterTypeOrm } from './infrastructure/persistence/typeorm/cash-payment-totals.adapter.typeorm';
import { CashRegisterOrmEntity } from './infrastructure/persistence/typeorm/cash-register.orm-entity';
import { CashRegisterRepositoryTypeOrm } from './infrastructure/persistence/typeorm/cash-register.repository.typeorm';
import { CashSessionOrmEntity } from './infrastructure/persistence/typeorm/cash-session.orm-entity';
import { CashSessionRepositoryTypeOrm } from './infrastructure/persistence/typeorm/cash-session.repository.typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([CashRegisterOrmEntity, CashSessionOrmEntity])],
  controllers: [CashRegistersController, CashSessionsController],
  providers: [
    OpenCashSessionUseCase,
    CloseCashSessionUseCase,
    GetActiveSessionUseCase,
    GetSessionSummaryUseCase,
    ListSessionsUseCase,
    { provide: CASH_REGISTER_REPOSITORY, useClass: CashRegisterRepositoryTypeOrm },
    { provide: CASH_SESSION_REPOSITORY, useClass: CashSessionRepositoryTypeOrm },
    { provide: CASH_PAYMENT_TOTALS_PORT, useClass: CashPaymentTotalsAdapterTypeOrm },
  ],
  exports: [CASH_SESSION_REPOSITORY],
})
export class CashSessionsModule {}
