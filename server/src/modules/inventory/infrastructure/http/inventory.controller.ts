import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../../../auth/infrastructure/http/current-user.decorator';
import { ActiveBranch } from '../../../../common/branch/active-branch.decorator';
import { Roles } from '../../../auth/infrastructure/http/roles.decorator';
import { AdjustStockUseCase } from '../../application/use-cases/adjust-stock.use-case';
import { GetStockHistoryUseCase } from '../../application/use-cases/get-stock-history.use-case';
import {
  InsufficientStockError,
  InvalidStockQuantityError,
  ProductNotFoundForStockError,
} from '../../domain/errors/inventory.errors';
import { AdjustStockRequestDto } from './dto/adjust-stock.request-dto';
import { ListMovementsQuery } from './dto/list-movements.query';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly adjust: AdjustStockUseCase,
    private readonly history: GetStockHistoryUseCase,
  ) {}

  @Post('adjust')
  @Roles('ADMIN', 'MANAGER')
  async adjustStock(@Body() body: AdjustStockRequestDto, @CurrentUser() user: CurrentUserPayload) {
    try {
      return await this.adjust.execute({
        productId: body.productId,
        variantId: body.variantId,
        quantity: body.quantity,
        reason: body.reason,
        userId: user.id,
      });
    } catch (e) {
      if (e instanceof ProductNotFoundForStockError) throw new NotFoundException(e.message);
      if (e instanceof InsufficientStockError) throw new ConflictException(e.message);
      if (e instanceof InvalidStockQuantityError) throw new BadRequestException(e.message);
      throw e;
    }
  }

  @Get('movements')
  listMovements(@Query() q: ListMovementsQuery, @ActiveBranch() branchId: string) {
    return this.history.execute({
      productId: q.productId,
      type: q.type,
      branchId,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      limit: q.limit,
      offset: q.offset,
      sort: q.sort,
      sortDir: q.sortDir,
    });
  }
}
