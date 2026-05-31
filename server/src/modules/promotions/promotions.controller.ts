import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ActiveBranch } from '../../common/branch/active-branch.decorator';
import { RequirePermissions } from '../auth/infrastructure/http/permissions.decorator';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { ListPromotionsQuery } from './dto/list-promotions.query';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionsService } from './promotions.service';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly service: PromotionsService) {}

  @Get()
  @RequirePermissions('promotions.read')
  list(@Query() q: ListPromotionsQuery, @ActiveBranch() branchId: string) {
    return this.service.list(q, branchId);
  }

  @Get(':id')
  @RequirePermissions('promotions.read')
  findById(@Param('id', ParseUUIDPipe) id: string, @ActiveBranch() branchId: string) {
    return this.service.findById(id, branchId);
  }

  @Post()
  @RequirePermissions('promotions.create')
  create(@Body() dto: CreatePromotionDto, @ActiveBranch() branchId: string) {
    return this.service.create(dto, branchId);
  }

  @Patch(':id')
  @RequirePermissions('promotions.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromotionDto,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.update(id, dto, branchId);
  }

  @Delete(':id')
  @RequirePermissions('promotions.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveBranch() branchId: string,
  ): Promise<void> {
    await this.service.softDelete(id, branchId);
  }
}
