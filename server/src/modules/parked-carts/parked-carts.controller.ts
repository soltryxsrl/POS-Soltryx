import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/infrastructure/http/current-user.decorator';
import { Roles } from '../auth/infrastructure/http/roles.decorator';
import { CreateParkedCartRequestDto } from './dto/create-parked-cart.request-dto';
import { ParkedCartsService } from './parked-carts.service';

@Controller('parked-carts')
export class ParkedCartsController {
  constructor(private readonly service: ParkedCartsService) {}

  @Get()
  list(
    @Query('cashSessionId', new ParseUUIDPipe()) cashSessionId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.listForUserSession(user.id, cashSessionId);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  create(
    @Body() body: CreateParkedCartRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create({
      userId: user.id,
      cashSessionId: body.cashSessionId,
      customerId: body.customerId,
      label: body.label,
      notes: body.notes,
      payload: body.payload,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<void> {
    const isPriv = user.roles.includes('ADMIN') || user.roles.includes('MANAGER');
    await this.service.delete(id, user.id, isPriv);
  }
}
