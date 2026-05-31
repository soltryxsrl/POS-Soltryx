import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { ActiveBranch } from '../../../../common/branch/active-branch.decorator';
import { Roles } from '../../../auth/infrastructure/http/roles.decorator';
import {
  CASH_REGISTER_REPOSITORY,
  type CashRegisterRepository,
} from '../../domain/ports/cash-register.repository.port';
import { CreateCashRegisterRequestDto } from './dto/create-cash-register.request-dto';

class ListRegistersQuery {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  isActive?: boolean;
}

@Controller('cash-registers')
export class CashRegistersController {
  constructor(
    @Inject(CASH_REGISTER_REPOSITORY)
    private readonly registers: CashRegisterRepository,
  ) {}

  @Get()
  list(@Query() q: ListRegistersQuery, @ActiveBranch() branchId: string) {
    return this.registers.list({ isActive: q.isActive, branchId });
  }

  /** Crea una caja en la sucursal activa. Solo ADMIN/MANAGER. */
  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(
    @Body() dto: CreateCashRegisterRequestDto,
    @ActiveBranch() branchId: string,
  ) {
    return this.registers.create({ name: dto.name, code: dto.code, branchId });
  }
}
