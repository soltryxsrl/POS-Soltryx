import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/infrastructure/http/current-user.decorator';
import { RequirePermissions } from '../auth/infrastructure/http/permissions.decorator';
import { CustomerAccountService } from './customer-account.service';
import { RegisterPaymentRequestDto } from './dto/register-payment.request-dto';

@Controller('customers/:customerId/account')
export class CustomerAccountController {
  constructor(private readonly service: CustomerAccountService) {}

  @Get()
  @RequirePermissions('account.read')
  summary(@Param('customerId', ParseUUIDPipe) customerId: string) {
    return this.service.getSummary(customerId);
  }

  @Post('payments')
  @RequirePermissions('account.payment')
  registerPayment(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() body: RegisterPaymentRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.registerPayment({
      customerId,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      cashSessionId: body.cashSessionId,
      reference: body.reference,
      notes: body.notes,
      userId: user.id,
    });
  }
}
