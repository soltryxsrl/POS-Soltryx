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
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../../../auth/infrastructure/http/current-user.decorator';
import { Roles } from '../../../auth/infrastructure/http/roles.decorator';
import { CloseCashSessionUseCase } from '../../application/use-cases/close-cash-session.use-case';
import { GetActiveSessionUseCase } from '../../application/use-cases/get-active-session.use-case';
import { GetSessionSummaryUseCase } from '../../application/use-cases/get-session-summary.use-case';
import { ListSessionsUseCase } from '../../application/use-cases/list-sessions.use-case';
import { OpenCashSessionUseCase } from '../../application/use-cases/open-cash-session.use-case';
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

@Controller('cash-sessions')
export class CashSessionsController {
  constructor(
    private readonly openUC: OpenCashSessionUseCase,
    private readonly closeUC: CloseCashSessionUseCase,
    private readonly activeUC: GetActiveSessionUseCase,
    private readonly summaryUC: GetSessionSummaryUseCase,
    private readonly listUC: ListSessionsUseCase,
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
  async list(@Query() q: ListSessionsQuery, @CurrentUser() user: CurrentUserPayload) {
    // CASHIER solo ve sus propias sesiones
    const restrictToSelf = !user.roles.includes('ADMIN') && !user.roles.includes('MANAGER');
    return this.listUC.execute({
      status: q.status,
      cashRegisterId: q.cashRegisterId,
      openedById: restrictToSelf ? user.id : q.openedById,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      limit: q.limit,
      offset: q.offset,
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
  open(@Body() body: OpenCashSessionRequestDto, @CurrentUser() user: CurrentUserPayload) {
    return this.handle(() =>
      this.openUC.execute({
        cashRegisterId: body.cashRegisterId,
        openingAmount: body.openingAmount,
        notes: body.notes,
        openedById: user.id,
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
        notes: body.notes,
        closedById: user.id,
      }),
    );
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
