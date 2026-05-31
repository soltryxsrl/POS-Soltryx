import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ActiveBranch } from '../../common/branch/active-branch.decorator';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/infrastructure/http/current-user.decorator';
import { RequirePermissions } from '../auth/infrastructure/http/permissions.decorator';
import {
  CreateStockCountRequestDto,
  SetStockCountItemsRequestDto,
} from './dto/stock-count.request-dto';
import { StockCountsService } from './stock-counts.service';

@Controller('stock-counts')
export class StockCountsController {
  constructor(private readonly service: StockCountsService) {}

  @Get()
  @RequirePermissions('inventory.read')
  list(
    @ActiveBranch() branchId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.list(branchId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('inventory.read')
  findById(@Param('id', ParseUUIDPipe) id: string, @ActiveBranch() branchId: string) {
    return this.service.findById(id, branchId);
  }

  @Post()
  @RequirePermissions('inventory.adjust')
  create(
    @Body() dto: CreateStockCountRequestDto,
    @CurrentUser() user: CurrentUserPayload,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.create(dto, user.id, branchId);
  }

  @Put(':id/items')
  @RequirePermissions('inventory.adjust')
  setItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetStockCountItemsRequestDto,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.setItems(id, dto, branchId);
  }

  @Post(':id/complete')
  @RequirePermissions('inventory.adjust')
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.complete(id, user.id, branchId);
  }

  @Post(':id/cancel')
  @RequirePermissions('inventory.adjust')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.cancel(id, user.id, branchId);
  }
}
