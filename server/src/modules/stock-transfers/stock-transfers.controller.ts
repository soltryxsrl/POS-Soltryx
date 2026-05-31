import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ActiveBranch } from '../../common/branch/active-branch.decorator';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/infrastructure/http/current-user.decorator';
import { RequirePermissions } from '../auth/infrastructure/http/permissions.decorator';
import { CreateStockTransferRequestDto } from './dto/create-stock-transfer.request-dto';
import { StockTransfersService } from './stock-transfers.service';

class CancelStockTransferRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

@Controller('stock-transfers')
export class StockTransfersController {
  constructor(private readonly service: StockTransfersService) {}

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
    @Body() dto: CreateStockTransferRequestDto,
    @CurrentUser() user: CurrentUserPayload,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.create(dto, user.id, branchId);
  }

  @Post(':id/receive')
  @RequirePermissions('inventory.adjust')
  receive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.receive(id, user.id, branchId);
  }

  @Post(':id/cancel')
  @RequirePermissions('inventory.adjust')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelStockTransferRequestDto,
    @CurrentUser() user: CurrentUserPayload,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.cancel(id, user.id, branchId, dto.reason);
  }
}
