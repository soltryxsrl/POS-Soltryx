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
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/infrastructure/http/current-user.decorator';
import { RequirePermissions } from '../auth/infrastructure/http/permissions.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQuery } from './dto/list-users.query';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @RequirePermissions('users.read')
  list(@Query() q: ListUsersQuery) {
    return this.service.list(q);
  }

  @Get(':id')
  @RequirePermissions('users.read')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @RequirePermissions('users.create')
  create(@Body() dto: CreateUserDto, @CurrentUser() current: CurrentUserPayload | undefined) {
    return this.service.create(dto, current);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() current: CurrentUserPayload | undefined,
  ) {
    return this.service.update(id, dto, current);
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() current: CurrentUserPayload | undefined,
  ): Promise<void> {
    await this.service.softDelete(id, current?.id ?? '', current?.username);
  }
}
