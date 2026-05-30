import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
} from '@nestjs/common';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/infrastructure/http/current-user.decorator';
import { RequirePermissions } from '../auth/infrastructure/http/permissions.decorator';
import { CurrenciesService } from './currencies.service';
import { SetExchangeRateRequestDto } from './dto/set-rate.request-dto';
import { ToggleCurrencyRequestDto } from './dto/toggle-currency.request-dto';

@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly service: CurrenciesService) {}

  @Get()
  @RequirePermissions('currencies.read')
  list(@Query('activeOnly') activeOnly?: string) {
    return this.service.list(activeOnly === 'true');
  }

  @Patch(':code')
  @RequirePermissions('currencies.manage')
  toggle(
    @Param('code') code: string,
    @Body() dto: ToggleCurrencyRequestDto,
  ) {
    return this.service.setActive(code.toUpperCase(), dto.isActive);
  }

  @Put(':code/rate')
  @RequirePermissions('currencies.manage')
  setRate(
    @Param('code') code: string,
    @Body() dto: SetExchangeRateRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.setRate(code.toUpperCase(), dto.rate, user.id);
  }
}
