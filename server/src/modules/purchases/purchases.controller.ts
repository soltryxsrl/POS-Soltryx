import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ActiveBranch } from '../../common/branch/active-branch.decorator';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/infrastructure/http/current-user.decorator';
import { RequirePermissions } from '../auth/infrastructure/http/permissions.decorator';
import { CancelPurchaseOrderRequestDto } from './dto/cancel-purchase-order.request-dto';
import { CreatePurchaseOrderRequestDto } from './dto/create-purchase-order.request-dto';
import { ListPurchaseOrdersQuery } from './dto/list-purchase-orders.query';
import { ReceivePurchaseOrderRequestDto } from './dto/receive-purchase-order.request-dto';
import { UpdateFiscalDataRequestDto } from './dto/update-fiscal-data.request-dto';
import { PurchasesService } from './purchases.service';

@Controller('purchase-orders')
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  @Get()
  @RequirePermissions('purchases.read')
  list(@Query() q: ListPurchaseOrdersQuery, @ActiveBranch() branchId: string) {
    return this.service.list(q, branchId);
  }

  @Get(':id')
  @RequirePermissions('purchases.read')
  findById(@Param('id', ParseUUIDPipe) id: string, @ActiveBranch() branchId: string) {
    return this.service.findById(id, branchId);
  }

  @Post()
  @RequirePermissions('purchases.create')
  create(
    @Body() dto: CreatePurchaseOrderRequestDto,
    @CurrentUser() user: CurrentUserPayload,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.create(dto, user.id, branchId);
  }

  @Post(':id/receive')
  @RequirePermissions('purchases.receive')
  receive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceivePurchaseOrderRequestDto,
    @CurrentUser() user: CurrentUserPayload,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.receive(id, dto, user.id, branchId);
  }

  @Patch(':id/fiscal')
  @RequirePermissions('purchases.create')
  updateFiscal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFiscalDataRequestDto,
    @CurrentUser() user: CurrentUserPayload,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.updateFiscalData(id, dto, user.id, branchId);
  }

  @Post(':id/cancel')
  @RequirePermissions('purchases.cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPurchaseOrderRequestDto,
    @CurrentUser() user: CurrentUserPayload,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.cancel(id, dto, user.id, branchId);
  }
}
