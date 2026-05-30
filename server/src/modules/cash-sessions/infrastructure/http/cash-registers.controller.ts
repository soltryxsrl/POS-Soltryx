import { Controller, Get, Inject, Query } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import {
  CASH_REGISTER_REPOSITORY,
  type CashRegisterRepository,
} from '../../domain/ports/cash-register.repository.port';

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
  list(@Query() q: ListRegistersQuery) {
    return this.registers.list({ isActive: q.isActive });
  }
}
