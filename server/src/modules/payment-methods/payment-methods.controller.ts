import { Body, Controller, Get, Param, Patch, Put, Query } from '@nestjs/common';
import { RequirePermissions } from '../auth/infrastructure/http/permissions.decorator';
import {
  PaymentMethodsService,
  type PaymentMethodResponse,
} from './payment-methods.service';
import { UpdatePaymentMethodRequestDto } from './dto/update-payment-method.request-dto';

@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly service: PaymentMethodsService) {}

  @Get()
  @RequirePermissions('payment-methods.read')
  list(@Query('activeOnly') activeOnly?: string): Promise<PaymentMethodResponse[]> {
    return this.service.list(activeOnly === 'true');
  }

  @Patch(':code')
  @RequirePermissions('payment-methods.manage')
  update(
    @Param('code') code: string,
    @Body() dto: UpdatePaymentMethodRequestDto,
  ): Promise<PaymentMethodResponse> {
    return this.service.update(code.toUpperCase(), dto);
  }

  @Put(':code/default')
  @RequirePermissions('payment-methods.manage')
  setDefault(@Param('code') code: string): Promise<PaymentMethodResponse> {
    return this.service.setDefault(code.toUpperCase());
  }
}
