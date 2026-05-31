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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQuery } from './dto/list-customers.query';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @RequirePermissions('customers.read')
  list(@Query() q: ListCustomersQuery, @ActiveBranch() branchId: string) {
    return this.service.list(q, branchId);
  }

  @Get(':id')
  @RequirePermissions('customers.read')
  findById(@Param('id', ParseUUIDPipe) id: string, @ActiveBranch() branchId: string) {
    return this.service.findById(id, branchId);
  }

  @Post()
  @RequirePermissions('customers.create')
  create(@Body() dto: CreateCustomerDto, @ActiveBranch() branchId: string) {
    return this.service.create(dto, branchId);
  }

  @Patch(':id')
  @RequirePermissions('customers.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.update(id, dto, branchId);
  }

  @Delete(':id')
  @RequirePermissions('customers.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveBranch() branchId: string,
  ): Promise<void> {
    await this.service.softDelete(id, branchId);
  }
}
