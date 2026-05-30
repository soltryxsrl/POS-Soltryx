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
import { RequirePermissions } from '../auth/infrastructure/http/permissions.decorator';
import { CancelPurchaseOrderRequestDto } from './dto/cancel-purchase-order.request-dto';
import { CreatePurchaseOrderRequestDto } from './dto/create-purchase-order.request-dto';
import { ListPurchaseOrdersQuery } from './dto/list-purchase-orders.query';
import { ReceivePurchaseOrderRequestDto } from './dto/receive-purchase-order.request-dto';
import { PurchasesService } from './purchases.service';

@Controller('purchase-orders')
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  @Get()
  @RequirePermissions('purchases.read')
  list(@Query() q: ListPurchaseOrdersQuery) {
    return this.service.list(q);
  }

  @Get(':id')
  @RequirePermissions('purchases.read')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @RequirePermissions('purchases.create')
  create(
    @Body() dto: CreatePurchaseOrderRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(dto, user.id);
  }

  @Post(':id/receive')
  @RequirePermissions('purchases.receive')
  receive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceivePurchaseOrderRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.receive(id, dto, user.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('purchases.cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPurchaseOrderRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.cancel(id, dto, user.id);
  }
}
