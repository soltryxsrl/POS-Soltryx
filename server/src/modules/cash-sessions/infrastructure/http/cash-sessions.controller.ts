import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ActiveBranch } from '../../../../common/branch/active-branch.decorator';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../../../auth/infrastructure/http/current-user.decorator';
import { Roles } from '../../../auth/infrastructure/http/roles.decorator';
import { CloseCashSessionUseCase } from '../../application/use-cases/close-cash-session.use-case';
import { GetActiveSessionUseCase } from '../../application/use-cases/get-active-session.use-case';
import { GetSessionReportUseCase } from '../../application/use-cases/get-session-report.use-case';
import { GetSessionSummaryUseCase } from '../../application/use-cases/get-session-summary.use-case';
import { ListCashMovementsUseCase } from '../../application/use-cases/list-cash-movements.use-case';
import { ListSessionsUseCase } from '../../application/use-cases/list-sessions.use-case';
import { OpenCashSessionUseCase } from '../../application/use-cases/open-cash-session.use-case';
import { RecordCashMovementUseCase } from '../../application/use-cases/record-cash-movement.use-case';
import {
  CashRegisterInactiveError,
  CashRegisterNotFoundError,
  CashSessionAlreadyClosedError,
  CashSessionAlreadyOpenError,
  CashSessionNotFoundError,
  InvalidCashAmountError,
} from '../../domain/errors/cash-session.errors';
import { ActiveSessionQuery } from './dto/active-session.query';
import { CloseCashSessionRequestDto } from './dto/close-cash-session.request-dto';
import { ListSessionsQuery } from './dto/list-sessions.query';
import { OpenCashSessionRequestDto } from './dto/open-cash-session.request-dto';
import { RecordCashMovementRequestDto } from './dto/record-cash-movement.request-dto';

@Controller('cash-sessions')
export class CashSessionsController {
  constructor(
    private readonly openUC: OpenCashSessionUseCase,
    private readonly closeUC: CloseCashSessionUseCase,
    private readonly activeUC: GetActiveSessionUseCase,
    private readonly summaryUC: GetSessionSummaryUseCase,
    private readonly reportUC: GetSessionReportUseCase,
    private readonly listUC: ListSessionsUseCase,
    private readonly recordMovementUC: RecordCashMovementUseCase,
    private readonly listMovementsUC: ListCashMovementsUseCase,
  ) {}

  @Get('active')
  async getActive(@Query() q: ActiveSessionQuery, @CurrentUser() user: CurrentUserPayload) {
    if (q.mine === 'true') {
      return this.activeUC.execute({ userId: user.id });
    }
    if (q.cashRegisterId) {
      return this.activeUC.execute({ cashRegisterId: q.cashRegisterId });
    }
    return null;
  }

  @Get()
  async list(
    @Query() q: ListSessionsQuery,
    @CurrentUser() user: CurrentUserPayload,
    @ActiveBranch() branchId: string,
  ) {
    // CASHIER solo ve sus propias sesiones
    const restrictToSelf = !user.roles.includes('ADMIN') && !user.roles.includes('MANAGER');
    return this.listUC.execute({
      status: q.status,
      cashRegisterId: q.cashRegisterId,
      openedById: restrictToSelf ? user.id : q.openedById,
      branchId,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      limit: q.limit,
      offset: q.offset,
      sort: q.sort,
      sortDir: q.sortDir,
    });
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const summary = await this.handle(() => this.summaryUC.execute(id));
    return summary;
  }

  @Get(':id/summary')
  async summary(@Param('id', ParseUUIDPipe) id: string) {
    return this.handle(() => this.summaryUC.execute(id));
  }

  @Post('open')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  open(
    @Body() body: OpenCashSessionRequestDto,
    @CurrentUser() user: CurrentUserPayload,
    @ActiveBranch() branchId: string,
  ) {
    return this.handle(() =>
      this.openUC.execute({
        cashRegisterId: body.cashRegisterId,
        openingAmount: body.openingAmount,
        openingDenominations: body.openingDenominations ?? null,
        notes: body.notes,
        openedById: user.id,
        activeBranchId: branchId,
      }),
    );
  }

  @Post(':id/close')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CloseCashSessionRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.handle(() =>
      this.closeUC.execute({
        sessionId: id,
        countedAmount: body.countedAmount,
        closingDenominations: body.closingDenominations ?? null,
        closingDeclaredByMethod: body.closingDeclaredByMethod ?? null,
        notes: body.notes,
        closedById: user.id,
      }),
    );
  }

  @Get(':id/movements')
  listMovements(@Param('id', ParseUUIDPipe) id: string) {
    return this.handle(() => this.listMovementsUC.execute(id));
  }

  @Post(':id/movements')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  recordMovement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RecordCashMovementRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.handle(() =>
      this.recordMovementUC.execute({
        sessionId: id,
        type: body.type,
        amount: body.amount,
        reason: body.reason,
        userId: user.id,
      }),
    );
  }

  @Get(':id/report')
  report(@Param('id', ParseUUIDPipe) id: string) {
    return this.handle(() => this.reportUC.execute(id));
  }

  private async handle<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof CashRegisterNotFoundError) throw new NotFoundException(e.message);
      if (e instanceof CashSessionNotFoundError) throw new NotFoundException(e.message);
      if (e instanceof CashRegisterInactiveError) throw new ConflictException(e.message);
      if (e instanceof CashSessionAlreadyOpenError) throw new ConflictException(e.message);
      if (e instanceof CashSessionAlreadyClosedError) throw new ConflictException(e.message);
      if (e instanceof InvalidCashAmountError) throw new BadRequestException(e.message);
      throw e;
    }
  }
}
