import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ActiveBranch } from '../../../../common/branch/active-branch.decorator';
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
import { PreviewSaleTotalsUseCase } from '../../application/use-cases/preview-sale-totals.use-case';
import {
  CashSessionMismatchError,
  CustomerRequiredForAccountError,
  DiscountOverrideInvalidError,
  DiscountOverrideRequiredError,
  InvalidDiscountError,
  OpenItemInvalidError,
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
import { PreviewSaleTotalsRequestDto } from './dto/preview-sale-totals.request-dto';

@Controller('sales')
export class SalesController {
  constructor(
    private readonly create: CreateSaleUseCase,
    private readonly cancel: CancelSaleUseCase,
    private readonly get: GetSaleUseCase,
    private readonly listUC: ListSalesUseCase,
    private readonly preview: PreviewSaleTotalsUseCase,
  ) {}

  @Post('preview-totals')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  previewTotals(
    @Body() body: PreviewSaleTotalsRequestDto,
    @ActiveBranch() branchId: string,
  ) {
    return this.handle(() =>
      this.preview.execute({
        items: body.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          description: i.description,
          unitPrice: i.unitPrice,
          taxRate: i.taxRate,
          quantity: i.quantity,
          discount: i.discount,
        })),
        orderDiscount: body.orderDiscount,
        tipTotal: body.tipTotal,
        branchId,
      }),
    );
  }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  createSale(@Body() body: CreateSaleRequestDto, @CurrentUser() user: CurrentUserPayload) {
    const isPriv = user.roles.includes('ADMIN') || user.roles.includes('MANAGER');
    return this.handle(() =>
      this.create.execute({
        cashSessionId: body.cashSessionId,
        customerId: body.customerId,
        notes: body.notes,
        idempotencyKey: body.idempotencyKey,
        userId: user.id,
        currentUserPermissions: user.permissions,
        overrideCredentials: body.overrideCredentials ?? null,
        enforceSessionOwnership: !isPriv,
        fiscalDocTypeCode: body.fiscalDocTypeCode,
        orderDiscount: body.orderDiscount,
        tipTotal: body.tipTotal,
        items: body.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          description: i.description,
          unitPrice: i.unitPrice,
          taxRate: i.taxRate,
          quantity: i.quantity,
          discount: i.discount,
          notes: i.notes,
        })),
        payments: body.payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          currencyCode: p.currencyCode,
          reference: p.reference,
        })),
      }),
    );
  }

  @Get()
  async list(
    @Query() q: ListSalesQuery,
    @CurrentUser() user: CurrentUserPayload,
    @ActiveBranch() branchId: string,
  ) {
    const restrictToSelf = !user.roles.includes('ADMIN') && !user.roles.includes('MANAGER');
    return this.listUC.execute({
      q: q.q,
      status: q.status,
      paymentMethod: q.paymentMethod,
      cashSessionId: q.cashSessionId,
      userId: restrictToSelf ? user.id : q.userId,
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
  findById(@Param('id', ParseUUIDPipe) id: string, @ActiveBranch() branchId: string) {
    return this.handle(() => this.get.execute(id, branchId));
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'MANAGER')
  cancelSale(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CancelSaleRequestDto,
    @CurrentUser() user: CurrentUserPayload,
    @ActiveBranch() branchId: string,
  ) {
    return this.handle(() =>
      this.cancel.execute({ saleId: id, reason: body.reason, userId: user.id, branchId }),
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
      if (e instanceof OpenItemInvalidError) throw new BadRequestException(e.message);
      if (e instanceof PaymentInsufficientError) throw new BadRequestException(e.message);
      if (e instanceof CustomerRequiredForAccountError) throw new BadRequestException(e.message);
      // Override de descuento: 403 cuando se requiere y no llegó, 401 si las
      // credenciales del manager son inválidas.
      if (e instanceof DiscountOverrideRequiredError) throw new ForbiddenException({
        statusCode: 403,
        code: 'DISCOUNT_OVERRIDE_REQUIRED',
        message: e.message,
        percentage: e.percentage,
        thresholdPct: e.thresholdPct,
      });
      if (e instanceof DiscountOverrideInvalidError) throw new UnauthorizedException(e.message);
      if (e instanceof InsufficientStockError) throw new ConflictException(e.message);
      if (e instanceof SaleNotCancellableError) throw new ConflictException(e.message);
      throw e;
    }
  }
}
