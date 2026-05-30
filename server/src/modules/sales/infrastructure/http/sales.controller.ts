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
import {
  InsufficientStockError,
  ProductNotFoundForStockError,
} from '../../../inventory/domain/errors/inventory.errors';
import { CancelSaleUseCase } from '../../application/use-cases/cancel-sale.use-case';
import { CreateSaleUseCase } from '../../application/use-cases/create-sale.use-case';
import { GetSaleUseCase } from '../../application/use-cases/get-sale.use-case';
import { ListSalesUseCase } from '../../application/use-cases/list-sales.use-case';
import {
  CashSessionMismatchError,
  InvalidDiscountError,
  PaymentInsufficientError,
  ProductNotForSaleError,
  SaleHasNoItemsError,
  SaleHasNoPaymentsError,
  SaleNotCancellableError,
  SaleNotFoundError,
} from '../../domain/errors/sale.errors';
import { CancelSaleRequestDto } from './dto/cancel-sale.request-dto';
import { CreateSaleRequestDto } from './dto/create-sale.request-dto';
import { ListSalesQuery } from './dto/list-sales.query';

@Controller('sales')
export class SalesController {
  constructor(
    private readonly create: CreateSaleUseCase,
    private readonly cancel: CancelSaleUseCase,
    private readonly get: GetSaleUseCase,
    private readonly listUC: ListSalesUseCase,
  ) {}

  @Post()
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  createSale(@Body() body: CreateSaleRequestDto, @CurrentUser() user: CurrentUserPayload) {
    const isPriv = user.roles.includes('ADMIN') || user.roles.includes('MANAGER');
    return this.handle(() =>
      this.create.execute({
        cashSessionId: body.cashSessionId,
        customerId: body.customerId,
        notes: body.notes,
        userId: user.id,
        enforceSessionOwnership: !isPriv,
        items: body.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          discount: i.discount,
        })),
        payments: body.payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          reference: p.reference,
        })),
      }),
    );
  }

  @Get()
  async list(@Query() q: ListSalesQuery, @CurrentUser() user: CurrentUserPayload) {
    const restrictToSelf = !user.roles.includes('ADMIN') && !user.roles.includes('MANAGER');
    return this.listUC.execute({
      status: q.status,
      cashSessionId: q.cashSessionId,
      userId: restrictToSelf ? user.id : q.userId,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      limit: q.limit,
      offset: q.offset,
    });
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.handle(() => this.get.execute(id));
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'MANAGER')
  cancelSale(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CancelSaleRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.handle(() =>
      this.cancel.execute({ saleId: id, reason: body.reason, userId: user.id }),
    );
  }

  private async handle<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof SaleNotFoundError) throw new NotFoundException(e.message);
      if (e instanceof ProductNotForSaleError) throw new NotFoundException(e.message);
      if (e instanceof ProductNotFoundForStockError) throw new NotFoundException(e.message);

      if (e instanceof CashSessionMismatchError) throw new ConflictException(e.message);
      if (e instanceof SaleHasNoItemsError) throw new BadRequestException(e.message);
      if (e instanceof SaleHasNoPaymentsError) throw new BadRequestException(e.message);
      if (e instanceof InvalidDiscountError) throw new BadRequestException(e.message);
      if (e instanceof PaymentInsufficientError) throw new BadRequestException(e.message);
      if (e instanceof InsufficientStockError) throw new ConflictException(e.message);
      if (e instanceof SaleNotCancellableError) throw new ConflictException(e.message);
      throw e;
    }
  }
}
