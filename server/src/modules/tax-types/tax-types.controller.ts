import { Body, Controller, Get, Param, Patch, Put, Query } from '@nestjs/common';
import { RequirePermissions } from '../auth/infrastructure/http/permissions.decorator';
import { TaxTypesService, type TaxTypeResponse } from './tax-types.service';
import { ToggleTaxTypeRequestDto } from './dto/toggle-tax-type.request-dto';

@Controller('tax-types')
export class TaxTypesController {
  constructor(private readonly service: TaxTypesService) {}

  @Get()
  @RequirePermissions('tax-types.read')
  list(@Query('activeOnly') activeOnly?: string): Promise<TaxTypeResponse[]> {
    return this.service.list(activeOnly === 'true');
  }

  @Patch(':code')
  @RequirePermissions('tax-types.manage')
  toggle(
    @Param('code') code: string,
    @Body() dto: ToggleTaxTypeRequestDto,
  ): Promise<TaxTypeResponse> {
    return this.service.setActive(code.toUpperCase(), dto.isActive);
  }

  @Put(':code/default')
  @RequirePermissions('tax-types.manage')
  setDefault(@Param('code') code: string): Promise<TaxTypeResponse> {
    return this.service.setDefault(code.toUpperCase());
  }
}
