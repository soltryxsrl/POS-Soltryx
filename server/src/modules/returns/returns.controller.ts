import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/infrastructure/http/current-user.decorator';
import { ActiveBranch } from '../../common/branch/active-branch.decorator';
import { RequirePermissions } from '../auth/infrastructure/http/permissions.decorator';
import { CreateReturnRequestDto } from './dto/create-return.request-dto';
import { ListReturnsQuery } from './dto/list-returns.query';
import { ReturnsService } from './returns.service';

@Controller()
export class ReturnsController {
  constructor(private readonly service: ReturnsService) {}

  @Get('returns')
  @RequirePermissions('returns.read')
  list(@Query() q: ListReturnsQuery, @ActiveBranch() branchId: string) {
    return this.service.list(q, branchId);
  }

  @Get('returns/:id')
  @RequirePermissions('returns.read')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Get('sales/:saleId/returns')
  @RequirePermissions('returns.read')
  listForSale(@Param('saleId', ParseUUIDPipe) saleId: string) {
    return this.service.listForSale(saleId);
  }

  @Get('sales/:saleId/returnable-items')
  @RequirePermissions('returns.read')
  returnable(@Param('saleId', ParseUUIDPipe) saleId: string) {
    return this.service.getReturnableItems(saleId).then((rows) =>
      rows.map((r) => ({
        saleItemId: r.saleItem.id,
        productId: r.saleItem.productId,
        productName: r.saleItem.productNameSnapshot,
        productSku: r.saleItem.productSkuSnapshot,
        unitPrice: r.saleItem.unitPrice,
        taxRate: r.saleItem.taxRate,
        orderedQuantity: r.saleItem.quantity,
        alreadyReturned: r.alreadyReturned.toFixed(3),
        remaining: r.remaining.toFixed(3),
      })),
    );
  }

  @Post('returns')
  @RequirePermissions('returns.create')
  create(
    @Body() dto: CreateReturnRequestDto,
    @CurrentUser() user: CurrentUserPayload,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.create(dto, user.id, branchId);
  }
}
