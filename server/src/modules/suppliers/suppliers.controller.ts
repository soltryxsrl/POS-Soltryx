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
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersQuery } from './dto/list-suppliers.query';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  @RequirePermissions('suppliers.read')
  list(@Query() q: ListSuppliersQuery, @ActiveBranch() branchId: string) {
    return this.service.list(q, branchId);
  }

  @Get(':id')
  @RequirePermissions('suppliers.read')
  findById(@Param('id', ParseUUIDPipe) id: string, @ActiveBranch() branchId: string) {
    return this.service.findById(id, branchId);
  }

  @Post()
  @RequirePermissions('suppliers.create')
  create(@Body() dto: CreateSupplierDto, @ActiveBranch() branchId: string) {
    return this.service.create(dto, branchId);
  }

  @Patch(':id')
  @RequirePermissions('suppliers.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.update(id, dto, branchId);
  }

  @Delete(':id')
  @RequirePermissions('suppliers.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveBranch() branchId: string,
  ): Promise<void> {
    await this.service.softDelete(id, branchId);
  }
}
