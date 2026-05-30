import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { RequirePermissions } from '../../auth/infrastructure/http/permissions.decorator';
import {
  FiscalDocTypesService,
  type FiscalDocTypeResponse,
} from './fiscal-doc-types.service';
import { ToggleFiscalDocTypeRequestDto } from './dto/toggle-doc-type.request-dto';

@Controller('fiscal/doc-types')
export class FiscalDocTypesController {
  constructor(private readonly service: FiscalDocTypesService) {}

  @Get()
  @RequirePermissions('fiscal.types.read')
  list(
    @Query('activeOnly') activeOnly?: string,
    @Query('appliesTo') appliesTo?: 'SALE' | 'PURCHASE' | 'BOTH',
  ): Promise<FiscalDocTypeResponse[]> {
    return this.service.list({
      activeOnly: activeOnly === 'true',
      appliesTo,
    });
  }

  @Patch(':code')
  @RequirePermissions('fiscal.types.manage')
  toggle(
    @Param('code') code: string,
    @Body() dto: ToggleFiscalDocTypeRequestDto,
  ): Promise<FiscalDocTypeResponse> {
    return this.service.setActive(code, dto.isActive);
  }
}
